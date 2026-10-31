# Dawn of Braga · *Amanecer en Braga*

Survival horror medieval en 3D con combate **Soulslike**, ambientado en una Braga ficticia en octubre de 1167: desde
hace tres años Portugal pierde tierra ante los almohades, que han vuelto a llegar a sus murallas. La ciudad ha caído:
la campana de la catedral tocó sola, los que la oyeron se arrodillaron ante algo que dormía bajo ella, y la
corrupción ha deformado a vivos y muertos. Despiertas en una celda de las mazmorras del castillo. Tu única meta: **salir de Braga**.

*Dark Souls + Resident Evil 2 + Silent Hill*, en pequeño: un mapa compacto e interconectado, llaves y herramientas
que abren atajos y zonas nuevas, pocos enemigos pero peligrosos, niebla espesa y una estética de juego perdido de
PS1/PS2. Pensado para completarse en **45–60 minutos**.

> Todo el juego se genera por código: geometría, texturas (dibujadas píxel a píxel), iluminación, efectos,
> animaciones, interfaz, sonido y música. No hay ni un solo archivo de imagen, modelo o audio; las únicas piezas
> externas son cinco fuentes pixeladas libres (licencia OFL, en `src/fonts/`), incrustadas en el propio archivo.

## Cómo jugar

- **Versión lista para jugar:** abre `docs/index.html` en un navegador de escritorio (Chrome, Edge o Firefox).
  Es un único archivo autocontenido; también puede publicarse tal cual con GitHub Pages (carpeta `/docs`).
- **Desde el código:**
  ```bash
  npm install
  npm run dev      # servidor de desarrollo en http://localhost:5173
  npm run build    # genera dist/index.html (archivo único)
  ```

Requiere WebGL 2. Se recomienda jugar con mando (XInput) o con teclado y ratón.

## Controles

| Acción | Teclado y ratón | Mando (XInput) |
|---|---|---|
| Moverse | W A S D | Stick izquierdo |
| Cámara | Ratón | Stick derecho |
| Ataque ligero (combo de 3) | Clic izquierdo | RB |
| Ataque pesado | F | RT |
| Bloquear con el escudo | Clic derecho (mantener) | LB |
| **Parry** (desviar un golpe) | Clic derecho justo antes del golpe | LB |
| Golpe de gracia (al desequilibrado) | Clic izquierdo | RB |
| Esquivar / correr (mantener) | Espacio | B |
| Correr | Mayús | L3 |
| Fijar objetivo (el enemigo que tienes delante) | Q / clic central | R3 |
| Cambiar de objetivo | Mover el ratón hacia un lado | Stick derecho |
| Beber una ampolla | R | X |
| Interactuar | E | A |
| Inventario y documentos | Tab / I | Y |
| Inventario: cambiar de pestaña (Equipo, Objetos, Documentos) | Q / R | LB / RB |
| Inventario: elegir lo de una ranura / quitárselo | E o clic / X | A / X |
| Transcripción de un documento (mostrarla u ocultarla) | T | X |
| Mapa | M | View |
| Pausa y opciones | Esc | Start |

## Qué hay dentro

**La introducción.** Al empezar partida, poco más de un minuto contado como las de Dark Souls o Elden Ring: frases
sueltas que no explican nada (lo que significan se va sabiendo jugando) sobre planos casi a oscuras, para que no
se vea dónde: la fuente sin nombre y su ídolo, las letras del ara romana, un monje con un farol y cuatro cerrojos,
la hueste almohade ante la muralla, alguien de rodillas ante el ídolo sobre una luz roja, la campana que toca sola,
los que la oyen y se arrodillan, la pared de la celda escrita con sangre («No todos.»: no fue el único que la oyó
sin arrodillarse) y el ídolo que abre el ojo. Es en tiempo real, en los sitios de verdad del juego, y lo que pasó
en ellos lo cuentan los **ecos**: figuras de luz pálida que se deshacen en ceniza, esculpidas (no cajas) y cada una
con su cara y con lo suyo, que es lo que dice quién era: el arzobispo, viejo y seco, con la mitra y sus ínfulas, la
casulla, el palio y el incensario; San Martín, encorvado bajo la capucha, con la barba partida, el cayado y el
farol; el sacerdote romano con la toga sobre la cabeza; el cantero con su mazo; los Velados con la cara bajo el
paño; los canónigos (uno seco, otro gordo) con la muceta; los almohades con turbante, lizam, albornoz y adarga; y
la gente de Braga, cada cual con lo suyo. Se salta manteniendo «interactuar».
Al vencer al arzobispo por primera vez se desbloquea en el menú del título la **Crónica de Braga**: la versión
larga (casi tres minutos), que sí lo cuenta todo y en orden, de Roma al sello (para verla antes: `?cronica=1`).

**La historia** (lo que se sabe al final; destripa el juego). Bajo Braga hay una fuente sin nombre y, en ella, algo
estrictamente malo que nadie conoce. Los romanos le alzaron un templo sin saber a quién (DEO IGNOTO) y lo que
supieron después se perdió con ellos. San Martín de Dumio no lo rompió, porque no se rompe lo que no se conoce: le
cortó la mano al ídolo, le echó cuatro cerrojos y puso delante a dos que se taparon la cara, los Velados. En el
asedio de 1167 el arzobispo bajó a pedirle que salvara la ciudad: abrió la puerta con la Garra, se arrodilló
sobre la fuente, metió las manos por la reja... y lo de dentro se quedó con él: desde entonces es su cuerpo en la
tierra, y algo que no se ve le ata a la fuente. Dos canónigos le arrancaron la llave a la puerta y la cerraron con él
dentro, y la campana de la Sé tocó sola: los que la oyeron se arrodillaron y los de fuera entraron como si alguien
los llamara. Tú eres el preso de la celda del fondo, el que resistió: con las uñas arrancadas escribiste NO TE
ARRODILLES por las paredes y te costó parte de la memoria. Por eso se fijó en ti: no eres un elegido por gracia,
eres el más fuerte de los que quedaron, y quien te levanta cada vez que caes es quien piensa usarte. Dom Paio, uno
de los dos canónigos, lo sabe a medias (por la reja de la Confesión oye al arzobispo cantar que vendrás) y te avisa
de lo único seguro: que nadie sabe lo que hay detrás de esa puerta, y que no te creas más fuerte que ello, porque
eso mismo creía el arzobispo. Se cuenta por los documentos (el carcelero, el canónigo, la inscripción romana, las
últimas palabras del arzobispo, la pared de la celda, el libro de presos) y por Dom Paio.

**Mundo.** El castillo (ver más abajo), la Calle del Soto, la Plaza
del Pan con su fuente, horca (con escalera por la que se sube al cadalso) y picota, la Calle de la Catedral, la Plaza
de la Catedral con la pira, la catedral (nave central con bóveda de cañón sobre arcos fajones y columnas adosadas,
coronas de velas colgadas, naves laterales con techo de vigas, arquerías, vidrieras, bancos con fieles muertos, y
un tejado con su grueso), el claustro (galerías con un tejado de faldones que se unen en limas, sus pares y faroles), la
Calle de los Pellejeros y las curtidurías, la Calle de la Muralla con su adarve y la Torre del Postigo, la Calle de la
Herrería con la fragua de maese Lourenço (una nave a doble altura, negra de hollín hasta las vigas, que se abre a la
plaza por un portalón: la forja con su campana y su cañón echando chispas, el fuelle de dos cámaras, el yunque sobre
su tajo, la pila de templar, la clavera; el herrero, de rodillas, con el brazo metido en las brasas; las cotas de la
guarnición con carne cosida a las anillas, apiladas para el fuego; la vivienda en un sobrado, San Eloy con sus
exvotos y, fuera, el soportal con el potro de herrar y la mula muerta dentro), y bajo la
catedral, todo abovedado: la escalera de la cripta, que baja por debajo de la nave bajo una bóveda en rampa; la sala
de llegada, de tres naves sobre columnas y arcos; el osario, un pasillo de calaveras con bóveda de huesos, fajones y
nichos con sus huesos; el templo romano de *Bracara Augusta*, una basílica de tres naves (arquerías sobre pilares,
bóvedas de cañón estucadas, el mosaico en la nave del medio y, al fondo, el ábside con su cuarto de esfera y el altar
DEO IGNOTO entre dos braseros); el sepulcro del arzobispo, su capilla funeraria (su sepulcro, abierto y vacío, en un
estrado entre candeleros y bajo sus estandartes, y los de su cabildo en fila), y la cisterna del Dios Desconocido, un
corro de columnas con sus arcos bajo una cúpula con nervios de la que cuelga una corona de velas. La galería del río
sube bajo su bóveda hasta las orillas
del Este. Tras el Postigo, el adarve del muro este sigue
hacia el norte (atraviesa una torre), sube en la esquina a la muralla norte y corre hacia poniente por otras dos
torres hasta la Torre del Fanal, con un tramo de adarve hundido a medio camino; desde allí arriba se ven los
tejados de toda la ciudad, la Sé y el campamento de los sitiadores.

**El final.** La galería sale a la orilla del Este al amanecer: el río (agua con su corriente y el camino de brillos
del sol), un embarcadero con la barca amarrada y, enfrente, el prado con chopos, un cruceiro junto al camino a
contraluz, una ermita en el alto y las sierras detrás. En la escena final el jugador baja al embarcadero y lo anda
hasta la punta; la cámara le sigue por la ribera, le espera desde el agua (con la muralla y el humo de la ciudad
detrás) y se alza a su espalda sobre el río y el sol que sale, antes del fundido.

**Los barrios.** Entre las calles principales hay una trama de callejones, pasadizos elevados, soportales y casas
que se pueden visitar por dentro: el Callejón del Pozo y su plazuela (con el pozo bajo un tejadillo a cuatro aguas,
su torno y su cubo), el Callejón del Arco, la Travesía de la Sé, la Taberna del Cuervo, el obrador de la tejedora
(telar y torno de hilar), el patio y el horno de pan (con artesas y hornos de leña), el Callejón de la Fragua, el
patio y el taller de los tintoreros (cubas de tinte y telas tendidas), el corral y el establo de los Pellejeros, y
la cerca de la ciudad cerrando cada barrio. Los altares de descanso están en lugares a salvo: la capilla de la
guarnición, el Oratorio de Santa Bárbara, la Capilla de San Fructuoso, la torre de la coracha y la cripta. Las casas que se pueden visitar
se distinguen desde la calle (faroles encendidos, rótulos, antorchas, la puerta entornada con luz dentro); las de
adorno tienen la puerta cerrada, y algunas clavadas con tablones o atrancadas.

**El barrio de los Pellejeros.** La barricada de los Pelames está clavada y apuntalada desde las Curtidurías: desde
la plaza no se mueve. Para llegar detrás hay que cruzar el barrio de los Pellejeros, que Mestre Clemente, el Físico de
los Inocentes, ha puesto en cuarentena: la boca de la calleja, enfrente de la fragua, está cerrada con un portón de
tablas con la cruz de cal y el cartel de CVARENTENA (se arranca con la palanca). Dentro, nada más entrar, una
escena: al fondo de la calleja, en la ventana de su alcoba, la cortina se aparta y asoma el pico; te mira, ladea la
cabeza como un pájaro: «Ah. Uno sano.» El barrio, casa por casa (todas con sus puertas a la calle, sus ventanas y
sus habitaciones, con su escalera de verdad): la Calleja de los Pellejeros (la ropa tendida, las pieles clavadas en
las fachadas, el carro volcado, los rótulos); la casa del zapatero, abierta (su hijo, ya curado, sentado a la mesa de
la cocina ante su cuenco); la de la cerera, la viuda (la tienda de las velas, la cocina, la sala y el oratorio, con
un altar de descanso, y la alcoba, atrancada por dentro: por la ventana de la sala se sale a la viga de lo que fue el
balcón y, haciendo equilibrio, se entra por la de la alcoba, donde está la llave de la tintorería; mientras tanto, el
Físico clava tablas en la puerta de la calle, por fuera, y se sale por el patio, por encima de la tapia, a la casa
quemada); la Plazuela de los Inocentes (el pozo con su polea, la cruz de piedra, el árbol muerto con su jaula, la paja con
sus cepos); la tintorería de maese Rodrigo (las tinas de añil, de rubia y de gualda, la cuerda con campanillas, y
arriba el secadero de los paños y la puerta del pescante); los tejados (la viga caída de la casa quemada, que cruza
la calleja: equilibrio; los tejados del sur, con sus cuervos; la casa del palomero, con su desván y el palomar de la
cumbrera, donde murió el aprendiz del herrero con la piedra de afilar bendita); la Casa de los Inocentes, por la
claraboya de su desván (las coronas a medio hacer y lo que les quitó a todos; su alcoba, con su mesa de escribir; la
botica, con el alambique, los frascos de adormidera y el cuenco de las piedras; la sala de los inocentes, con sus
camastros y sus cadenas; y el quirófano, donde se le pelea); su patio, el callejón y la cordelería (el almacén del
cáñamo, el obrador de las sogas y la tienda), con su puerta a los Pelames, detrás de la barricada: desde allí, la
barricada se viene abajo con la palanca (el atajo de vuelta). En los tejados, caer más de tres metros hiere, y más de
cinco y medio, mata. Las notas cuentan lo que pasó: el tratado del Físico, *De peste sanorum*, en dos partes, tu
historia clínica, el libro de cuentas del zapatero, el aviso del tintorero, lo que dejó escrito el cordelero.

**La Casa del Canónigo.** Una casa-torre de piedra que se reconoce desde las Curtidurías y la Calle de la Muralla:
portada de medio punto con tímpano, escudo pintado con el capelo y sus borlas, balcón de madera, faroles encendidos
a los lados de la puerta entornada y una torre almenada con la ventana alta siempre iluminada. Dentro, el zaguán,
el estudio (la llave del claustro sigue sobre la mesa), la alcoba, la cocina con su hogar y la despensa. Al fondo,
la puerta de la bodega, atrancada por el ama con sal y velas. Desde la casa ya se oye, abajo, algo que mastica.
Al asomarse a la escalera salta una cinemática: desde el sótano se ve la escalera, por la que baja el personaje
con su farol, y a la derecha, junto al altar, el canónigo, de espaldas, devorando un cadáver. Por encima del hombro
del personaje se ve el festín; un hueso cruje bajo la bota y se hace el silencio. Desde detrás del canónigo, a ras
de suelo, la cabeza del revés gira a sacudidas hasta mirarle y luego el cuerpo se da la vuelta, también a tirones,
crujiendo. Se agacha, se alza, grita y arroja el cadáver contra la pared. Arriba, a contraluz de una vela, el ama
cierra la puerta de un portazo y echa la tranca («Perdóneme, señor…»). Abajo, él sigue ahí, agazapado, mirándole;
se aleja de espaldas sin quitarle los ojos de encima, rodea un pilar y se mete marcha atrás en su gruta, junto a
unas velas. Desde dentro, a oscuras, sólo se le ven los ojos; se apagan, y se oye cómo se ríe.

**Las bodegas del canónigo.** Un laberinto de sótanos a oscuras, mucho más grande que la casa de arriba: la sala del
altar con sus pilares, la celda donde el ama encerraba al canónigo, la galería de los toneles con sus estanterías,
el Lagar (una sala enorme y diáfana, con la pila de pisar la uva y la luz pálida que cae por las rejillas de la
calle), la antecámara, la Cripta de los canónigos con sus sepulcros y santos velados, y el osario, con las paredes
de calaveras, que da la vuelta hasta la cripta. Los pasillos forman varios anillos, así que siempre hay otro camino
(para ti y para él). La puerta de arriba queda atrancada; la única salida es el pozo del Postigo, al fondo de la
cisterna vieja (al fondo, lejos de la reja), donde el agua negra refleja tu farol. Pero la cisterna la cierra un rastrillo colgado de tres
cadenas, y cada cadena de una palanca: una en el Lagar, otra en la cripta y la última al fondo del ramal ciego del
osario (lo cuenta la orden del canónigo al maestro de obras, en la mano de éste, muerto junto al rastrillo). Echar
una palanca cuesta unos siete segundos y medio de tirones y hace ruido: la cadena corre por la bóveda y él la oye
desde cualquier rincón; si te golpea (o la sueltas para esquivar), el mango vuelve a subir poco a poco. Con las
tres echadas, el rastrillo sube y se puede trepar por los pates del pozo hasta la calle (y, una vez descubierto,
volver a bajar por él). Casi todo se rompe: los pilares aguantan un par de embestidas antes de venirse abajo, los
sepulcros y los santos de la cripta revientan si te escondes detrás, y los toneles, los sacos y las estanterías
saltan en astillas (a tus golpes, o cuando él pasa, barre o carga). Si mueres, todo vuelve a estar como estaba
(palancas arriba, rastrillo bajado, nada roto); sólo si lo matas los cambios son para siempre. Cada vez que vuelves
a bajar, alguien cierra de un portazo allá arriba.

**El Empalado y la Bestia de Carne.** En lo alto del Postigo espera, arrodillado, el Empalado: un caballero de la
guarnición, gigante ya, al que los sitiadores clavaron a su propia puerta con una pica de asedio que le sigue
atravesando el cuerpo, con un trozo del portón y el estandarte de la ciudad todavía en el asta. Pelea con la cabeza
de carnero de un ariete montada en un madero, que arrastra echando chispas por la piedra: mazazo de arriba abajo
(se queda clavado en la piedra), barrido, barrido y revés, pisotón, golpe de regatón, estocada con la pica de su
propio vientre, embestida con la pica por delante y, sin yelmo, un salto con mazazo. Los golpes salen de donde de
verdad pasa el arma y revientan lo que encuentran: las almenas, el torno del rastrillo, los barriles, las cajas.
A medida que pierde vida se le va cayendo la armadura (hombreras, visera, medio peto) y asoma la carne.
Con un cuarto de vida **se transforma**: cae de rodillas, se le revientan una a una las piezas que le quedan, se
hincha y estalla en sangre, y lo que se levanta es **la Bestia de Carne**, un minotauro de músculo desollado con la
testuz de toro, cuernos de hueso y la columna en cresta. Ruge, se arranca la pica de la espalda y te la tira, y
embiste: si la esquivas, revienta el torno y la barricada que cerraba el adarve del norte y se queda un instante
con los cuernos clavados en la piedra. Por el hueco empieza **la huida**, por el adarve, con la Bestia pisándote los
talones (si te alcanza, te golpea; corres sin gastar aguante) y, de vez en cuando, un vistazo atrás. En cada tramo,
**pulsaciones rápidas** (en un anillo que se vacía, a cámara lenta, lo que hay que pulsar parpadeando: la tecla,
el ratón con el botón encendido o el botón del mando con su forma, gatillos y botones de los hombros): un sillar
arrancado del parapeto por el aire, una viga ardiendo atravesada en la torre (rodar por debajo), un salto sobre ti
en la esquina, el adarve hundido (saltar; si te quedas corto, cuelgas del borde y hay que trepar machacando) y los
**reflejos**: te corta el paso de un salto y llegan zarpazo (esquiva), cornada (desvía), zarpa (golpea) y mazazo
(rueda entre sus piernas). Fallar cuesta vida, no la partida. Al final, en lo alto de la Torre del Fanal no hay
salida: el **salto de fe** a la paja de la atalaya de la coracha. La Bestia se queda mirando desde lo alto, ruge y
se va. Si mueres durante la huida, vuelves al último tramo; si sales a mitad, al cruzar la niebla del Postigo
empieza otra vez la huida.

**El Callejón del Postigo y la Casa del Alemán.** Bajo la Torre del Postigo, un callejón de casas apiñadas lleva a
la Casa del Alemán, la de Henrique, nieto de un espadero de Solingen que vino con los cruzados de Colonia: una
casa grande, de piedra abajo y de entramado arriba, como las de la tierra del padre. Esta noche le han reventado la
puerta y la planta baja está infestada: tres criaturas aporrean la puerta de la escalera para subir a por él, otra
roe al oficial muerto en el taller, otra husmea en la cocina y otra se ha quedado de rodillas ante la cuna vacía.
Henrique, atrancado arriba, te llama desde la ventana de la sala alta. Muertas las de dentro, baja de verdad: cruza
el sobrado, baja por su escalera (sube desde la sala, tras su puerta, por encima de la del sótano), le quita la
tranca a la puerta, sale a la sala y cierra la de la calle con la barra de la fragua. Te avisa en un bocadillo
sobre la cabeza de que vienen más: entran en tres oleadas reventando las contraventanas y saltando por las
ventanas, y hay que defenderle (su barra de vida aparece arriba, en el centro; si cae él, se pierde la defensa y
vuelve a empezar). Vencidas todas, te cuenta su historia y la de su mujer, Leonor, y te da martillo y clavos: con
los tablones que hay por el callejón, el patio de la leña y el granero de arriba se tapian las ventanas una a una
para que su casa sea un lugar seguro. Hecho eso, te lleva al hogar de la sala: en la repisa, entre dos velas y
bajo el escudo del águila, está clavada de punta la **espada de su padre**, una espada del Sacro Imperio forjada en
Solingen, con + IN NOMINE DOMINI + en letras de latón en el vaceo y, en la otra cara, el nombre del que la forjó
(hace un 35 % más de daño que la espada del carcelero). Su padre la clavó ahí el día que colgó la cruz; la sacas
tú. Luego te da la llave del sótano: Leonor hizo un pacto con lo que él llama el diablo. Arriba, en el sobrado, se
anda por la sala alta (su refugio, con el jergón junto a la ventana), la cuchillería, la alcoba de su padre (la
capa blanca de cruzado colgada de un clavo, el yelmo sobre el arca, el altarcillo), el cuarto de los oficiales y
el granero. Bajo la despensa, el sótano y un túnel bajan a su gruta, donde está **Leonor, la Dolorosa**: una mujer
convertida en una bestia enorme, hinchada de pus, que llora y acuna un hatillo. Escupe pus que quema en el suelo,
barre con los brazos, se arrastra para abrazarte, aúlla y, a media vida, revienta. Al vencerla deja su última
lágrima (una ampolla más), y Henrique, si vuelves, la llora ante la repisa vacía.

**La casa tapiada, el pasadizo del Soto y la casa del tonelero.** En la Calle del Soto, la herbolería de Joana
tiene la puerta y las ventanas clavadas con tablones, pero entre tabla y tabla quedan rendijas y dentro hay luz:
desde la calle se ve el mostrador y, arriba, a Inés, la hija, de pie en la ventana del sobrado, mirando hacia la
catedral. La puerta se arranca con la palanca. Abajo, la tienda (el mostrador con el almirez, la balanza, los
albarelos y las velas, la estantería de botes, la mesa de trabajo con el recetario de Joana, que acaba en tres
noches escritas con prisa, y manojos de hierbas colgados de las vigas) y, tras un tabique, la cocina con el
hogar en brasas, la artesa y las ristras de ajos. Una escalera de madera sube al sobrado: la sala con el torno de
hilar, las hierbas tendidas a secar y la carta de la madre sobre la mesa, y la alcoba con dos camas y sangre. La
puerta del sobrado da al **pasadizo**, la casa de entramado que cruza por encima de la calle; a mitad, alguien
ha arrancado el suelo a hachazos (las tablas y las vigas están abajo, en el empedrado) y en el marco de enfrente
ha escrito a carbón NO CRUCES. El tablón que sobra de las ventanas de Henrique (hay seis para cinco) se tiende de
borde a borde y se cruza **haciendo equilibrio**: despacio, con los brazos en cruz, mientras el cuerpo se va
inclinando y hay que echarse hacia el otro lado (izquierda o derecha); quien se pasa cae a la calle y se lleva un
buen golpe. Al otro lado, la **casa del tonelero**: abajo, la tonelería (el fuego para curvar las duelas con su
corro de duelas, toneles, aros, la tabla de herramientas, el banco de desbastar y virutas), con la puerta a la
calle atrancada por dentro (un atajo de vuelta); arriba, la sala con la comida sin tocar, la ballesta, el hacha
con la que se arrancó el suelo, y la alcoba, donde Catarina yace en la cama bajo una sábana empapada, con las
manos cruzadas y una vela. En el rincón, de cara a la esquina y a la luz de la luna, **Miguel**, el hijo de
Joana: un morador infectado que aún conserva parte de sí. Llora y habla solo («No tengo hambre. No tengo
hambre.», «Todavía soy yo. Todavía.»). Si te ve, te grita que te vayas, que no va a poder contenerse; de cerca
se encoge, tiembla y se muerde el brazo para no lanzarse sobre ti, pero nunca ataca, y entre ruego y ruego
cuenta lo que pasó. Si sales de su casa y tardas en volver (o descansas, o caes), lo encuentras ahorcado de la
viga de la alcoba: el taburete volcado, la soga que cruje y, en el suelo, una duela escrita a carbón.

**La cripta honda y la Puerta del Dios Ignoto.** Bajo la cripta de siempre hay tres épocas, cada una más honda
(el diseño, en `PLAN_CRIPTA_HONDA.md` y `PLAN_OSARIOS.md`). Por la puerta del oeste del templo romano, un paso recto,
bajo una sola bóveda, baja por seis peldaños al **Panteón de los Obispos**: una rotonda con ocho obispos yacentes en
sus arcosolios (sepulcros de caliza con arquería ciega y, detrás, el fresco de cada uno con su nombre), un
deambulatorio abovedado, un anillo de doce columnas, la cúpula
pintada de estrellas y, colgada en medio, la corona de luz; en el centro se hunde el **pozo de los obispos**, con su
escalera pegada al muro y el sepulcro del primero, que tiene la cara tapada como los Velados. Cuatro salidas en cruz,
cada una con su luz, que se ven todas desde dentro: el paso al templo, la gran reja que da a la antesala (luz roja),
la bajada a las catacumbas (azul) y la **galilea** (oro), desde la que se pasa por tres arcos despejados a la
**cripta de San Martín de Dumio**, una iglesia de tres naves con arquerías de herradura: al fondo, la **Capilla de
San Martín** (altar de descanso), donde reza **Dom Paio**, el canónigo que bajó tras el arzobispo (al verte se
levanta de un salto; te cuenta lo que pasó y, cada vez que vuelves, lo que le falta a la puerta); a un lado, un
**osario de los hermanos de Dumio**; y en el eje, el **Pórtico de los Velados**, que da a la tribuna de la antesala.
Bajo el panteón (se baja por doce peldaños, bajo una bóveda en rampa que sigue en la de la galería), las
**Catacumbas de la Sé**: galerías con nichos en tres alturas bajo bóvedas de medio punto, cubículos con su arcosolio
y, en su cruce, la **Capilla de los Huesos**, como la de Évora (la bóveda encalada sobre fajones de fémures, los muros
forrados de calaveras y rosetones de huesos, el altar con el lema encima y el osario de los que ya no caben). Se juntan
en el **Lucernario de San Pedro de Rates**: una cámara redonda y alta tallada en la
roca, con cinco alturas de nichos (a los de arriba se sube por escaleras de mano), la cúpula de roca con el ojo del
lucernario, por donde cae la luz de la calle sobre una alberca de agua viva con velas que flotan, y el
**Oratorio** del santo en un ábside (otro altar), con el fresco de su martirio y exvotos de cera; más
abajo, la catacumba de los **Inocentes**, con su pila y el **Relicario de San Martín**, donde los muertos de la
cámara se juntan en el **Custodio de la Garra**: un coloso de calaveras y fémures que sale de un montón de huesos,
barre con los brazos, golpea el suelo con los dos (onda), lanza calaveras y agarra; se deshace en su montón para
rehacerse en otro sitio de la sala y, a media vida, pierde un brazo y se acelera. Al caer se abre el arca y la
Garra queda a la vista. Por el sepulcro del arzobispo se baja a la **cripta de los Mártires**, con su pila abajo y
la **Sacristía del arzobispo**, abovedada, que cierra una losa con el sigilo del Pacto: encajado el anillo del
arzobispo, la losa se hunde en el suelo. Bajo tierra no hay puertas de madera: dos atajos se abren desde abajo, cada
uno con su palanca, que cede de un tirón. En lo alto de la escalera de las catacumbas, un **lienzo del muro de la sala
de llegada** se hunde en el suelo: desde la sala no se nota (la misma piedra, a ras, con la misma luz y la misma
mugre que el muro) y desde la escalera es una losa entre sus jambas, con la palanca al lado. Y entre los Inocentes
y San Martín, un **rastrillo** que llena el arco, corre por las ranuras de las jambas y se mete entero en la fábrica
al subir; su palanca, en la escalera, se ve entre los barrotes. Las puertas de los cubículos de las catacumbas y la
de la pila de los Inocentes tienen su marco de piedra con la cruz en el dintel. La **Confesión**, al fondo del
osario de arriba, mira por una reja a la cisterna: por ella miraba Martín el agua de abajo y hoy sólo se ve piedra
negra, la espalda de lo que ha subido de la sima.

Desde la tribuna se ve entera la **Antesala del Dios Ignoto**: tres naves sobre columnas, con estatuas colosales
veladas, estandartes y una avenida de braseros que lleva la vista hasta el estrado y la puerta del dios, dos hojas
de piedra negra con un pentáculo invertido dentro de un círculo de signos, tres cabezas que lloran sobre el dintel
y la inscripción DEO IGNOTO. La puerta pide **cuatro cosas**, cada una con su sentido (San Martín de Dumio la cerró
con cuatro cerrojos, y los documentos lo cuentan): vencer a **los Velados**, sus dos guardianes de piedra, que
despiertan al pisar la nave (a tu espalda sube una reja) y pelean a la vez (uno ataca mientras el otro te rodea;
cuando cae uno, el otro enloquece); la **Garra de Oro**, que gira en la cerradura del centro como una llave; llenar
los **cinco círculos de sangre** de las puntas del pentáculo, abriendo las compuertas de las tres pilas (siete
tirones de cadena cada una: la sangre llora por las cabezas del dintel y corre por los surcos hasta los círculos,
y con los cinco llenos el pentáculo y la inscripción arden); y **el humo**, porque el dios no oye, huele: el
incienso negro del arzobispo, echado en el gran incensario del estrado, que la cadena iza sola y se mece como un
botafumeiro mientras su humo se arrastra hasta la puerta. La tercera pila, la de los **Condenados**, está en el
**Pozo**, bajo la antesala, tras la reja que abren los Velados al caer: allí espera Dom Paio, convertido, con el
cirial de hierro de la capilla (un jefe: mazazos, barridos, cera ardiendo y, a media vida, la letanía de fuego), y
hasta que cae no deja echar la cadena; en la capilla queda su breviario. Al examinarla, la puerta dice qué le
falta. Abierta, no da a ninguna cúpula: se baja por **el Paso**, estrecho y a oscuras, pegado a la roca, hasta un
atrio con un monje muerto de rodillas y, por un arco, al **Pasillo de los Gigantes**: cuatro pares de columnas
inmensas, lo que levantó Roma, bajo un techo que baja con el monte de encima; braseros, antorchas en los muros y
monjes muertos de rodillas con sus velas, todos cara al fondo. Al fondo, una boca de sillería con DEO · IGNOTO en el
dintel y la niebla del jefe, hilachas de humo rojo entre las que ya se adivina algo con cuernos contra un
resplandor. Detrás, **el Círculo**, de antes de Roma: un corro de roca viva bajo una bóveda de cueva, con seis
contrafuertes de roca y, entre ellos, nichos con velas, huesos y lo que han ido dejando; de la bóveda cuelga una
corona de hierro con sus velas. En el centro, **la fuente sin nombre**, por donde el dios toca el mundo: la reja de
Martín, arrancada al norte, donde se arrodilla el arzobispo, y el agua negra que late con una luz roja por debajo.
Y al fondo, no en el centro, en una sima abierta en la roca, **la estatua**: catorce metros de piedra negra y
mojada que nadie talló (tres veces y media el arzobispo), que se alza del agua roja de abajo y se agarra con una
mano de garras al borde, como si fuera a salir. El hábito de pliegues hondos, con los dos zunchos de hierro de
Martín (el de arriba, reventado) y sus cadenas tendidas hasta unas argollas del suelo; el manto, pesado, abierto
sobre un costillar que se abre como dos puertas y, al fondo del pecho, una brasa que late con la fuente; una
joroba de buitre (la misma que le salió al arzobispo); el brazo derecho alzado, descarnado, acabado en el muñón que
le dejó Martín (la mano de oro es la Garra, la que llevas); el cuello largo, de tendones y vértebras, y una cara
larga de hueso que no es de nada que se conozca, con dos cuernos (uno, roto), la corona de espinas de lo que fue
su halo y la diadema de oro hundida en la frente. Se recorta, negra, contra el rojo que arde en la roca de detrás
de la cabeza y que late con la fuente. Vuelve la cabeza, muy despacio, hacia quien entra, y la costura que le
parte la cara es un ojo: cuando te acercas (o empieza la pelea) rechinan los párpados de piedra, se oye detrás una
respiración honda y lo de dentro, alto como una almendra y con la pupila de cabra, te sigue; de cerca se le oye
susurrar. Por el este, la reja de la galería del río, que no se abre hasta que cae el jefe.

**El castillo, preparado para el asedio.** Una guarnición, no un palacio: cada parte sirve para resistir. Se entra
desde la Calle del Soto por una **torre-puerta en recodo** (rastrillo, buhederas en la bóveda, saeteras a los lados y
un giro a la izquierda antes del patio, para que nadie cargue en línea recta). El **patio de armas** tiene su pozo,
que baja al aljibe; el **cuartel de la tropa** (jergones en el suelo, la mesa larga, las lanzas de todos); la fragua
del armero con su muela; la cocina con el horno de pan y la caldera; las caballerizas, sin caballos (se los
comieron); la capilla de la guarnición, que acabó de hospital (el altar del castillo); el **fundíbulo** de la
defensa, partido por un tiro de los de fuera, con sus bolaños labrados a pico; caballos de frisa y la barricada de
la puerta. La escalera del adarve, pegada a la torre del homenaje, la partió un tiro: el tramo de arriba se desmoronó
en talud y quedan los peldaños volados y el escombro al pie; desde el patio no se sube a la muralla.

La **torre del homenaje**, el último reducto, rehecha como las románicas que se conservan enteras (Rochester,
Castle Hedingham): 26 × 26 m, a caballo de la muralla norte (asoma al foso del lado del Paço), con muros de casi
dos metros y medio, pilastras en las esquinas y en medio de cada lienzo, un zócalo en escalones, una imposta en
cada planta, ventanas geminadas de medio punto en la sala y cuatro torrecillas por encima de la terraza, a 22 m:
manda sobre el patio y sobre la ciudad. Se sube por una escalera exenta, metida en un antecuerpo de sillería que
llega a la muralla y a la torre de la cárcel, hasta un rellano frente a la puerta, en la planta primera; un
**puente levadizo** sobre un foso con estacas (quien cae en él se clava en ellas) la une con él, alzado desde
dentro. Cada planta la parte un muro de carga, con tabiques y puertas de arco. Planta baja: el **granero**, la
**bodega**, el **almacén** y el **pozo** de la torre, a los que sólo se baja por una trampilla. Primera: el
**cuerpo de guardia** con el **torno del puente**, el **dormitorio de los ballesteros** (con la trampilla), la
**armería** y el **taller del ballestero**. Segunda: la **sala del alcaide**, **a doble altura**, partida por un
**gran arco diafragma** de muro a muro, con una **galería** de madera sobre canes a lo largo de dos lienzos, dos
coronas de velas y el estandarte del Rey; bajo el arco, la mesa del Rey (ver más abajo), y al otro lado la mesa
del consejo con el plano de la defensa y el atril del libro de la guarnición; el **escritorio**, con el alcaide
muerto sobre sus cuentas junto a la chimenea y la manivela del torno que abre la reja de la cripta de la Sé, y
tras él su **alcoba**. Tercera, sobre ellos: la **cámara alta**, con los arcones del Rey que el alcaide subió del
Paço, su armadura de la frontera, su estandarte enrollado y un camastro junto al cañón de la chimenea; de ella
sale la puerta de la galería y la escalera de la terraza. Arriba, la **terraza** de combate: la caseta de la
escalera con su tejado a dos aguas, el matacán sobre la puerta, la chimenea, el fanal, la caldera de la pez,
piedras para tirar y, en su asta, el estandarte del Rey (la cruz azul en campo blanco). Forjados de tablas sobre
viguetas; la sala, bajo vigas gruesas de muro a muro. Todo sale de unas pocas medidas (`world/level_torre.js`).

**La planta de armas** (el camino hasta la ballesta). Un bolaño entró por el muro norte del taller y se llevó su
suelo; los de dentro tapiaron lo que pudieron. Del cuerpo de guardia al taller, un arco está lleno de escombro hasta
la clave (se ve la luz entre las piedras) y el otro, tapiado. La **armería**, clavada con tablones (la palanca);
dentro, el agujero del bolaño baja al **granero**. La trampilla del dormitorio la atrancaron por abajo: se abre desde
el almacén (el atajo de vuelta). En la **bodega**, la cuerda del **montacargas** sube al **pañol de los virotes**,
y del pañol, por una saetera que alguien ensanchó a mazazos, se sale al **cadalso**: la galería de madera colgada
por fuera de la torre, al norte y al este, con su pantalla de tablas, sus troneras, su tejadillo y tablas que faltan.
En la garita de la esquina vigila **el alférez mayor**, convertido, con la ballesta de la guardia (se planta lejos,
tira y la monta; si te le echas encima, culatazo; no vuelve). Lleva al cinto **la llave del alférez**, una de las
cinco de la reja de la Sé. Por la ventana del taller se entra en él: el suelo hundido hacia el agujero, las vigas
colgando, el maestro ballestero bajo una de ellas, su tabla rayada con un clavo y, en su banco, **la ballesta**.
El tabique se derriba desde dentro: el atajo a la guardia.

**La bajada tapiada.** Bajo la torre está la cárcel (la celda del fondo, la del jugador, queda justo debajo). Al
principio del juego, al fondo del pasillo de las celdas, una pared de ladrillo nuevo con la cal todavía fresca, donde
antes hubo una puerta; arañado en ella, LO QUE SUBE NO ES NUESTRO. Mucho después, desde el almacén de la torre, una
escalera baja por su hueco (los pretiles, el marco de la puerta arrancada, los surcos de algo grande en los muros) a
un pasadizo en recodo que acaba en el revés de ese tapiado: sacos, piedras y cal contra el ladrillo y, encima,
colgado de su viga, el sillar que hacía de contrapeso. Un virote a la cuerda y el sillar cae y se lleva el tapiado
por delante: el atajo de la torre a las celdas y a las catacumbas.

**El Paço del Rey.** Al norte del castillo, al otro lado de un **foso** seco y hondo, la casa que el Rey se hizo
cuando subió con su corte a la ciudad vieja (la ciudad crece hacia poniente para hacerle sitio). No un edificio
sino un recinto: sus murallas y torres; la **Puerta del Paço**, dos torres que asoman al foso con el paso
abovedado, el rastrillo alzado y el matacán, atrancada por dentro (desatrancarla deja el atajo al patio de armas,
por el **puente de piedra** de tres arcos y una puerta nueva en la muralla norte del castillo); y dentro, el
**Patio de la Corte**, con su pozo y un olmo seco: al norte, la **Sala de la Corte** en alto sobre su escalinata,
con sus contrafuertes, sus ventanas geminadas, los estandartes del Rey y las puertas atrancadas por dentro; al
oeste, la **galería de las cámaras** del Rey, una arquería con su techo de vigas; al sur, la **sala de los
archeros**, la guardia del Rey; y, detrás de la sala, la chimenea cónica de las cocinas. La primera vez se entra
por arriba: por la **escalera de la coracha**, que baja pegada a su cara de dentro desde lo alto, junto a su torre.
En el foso, al que baja una escalera de servicio desde el puente, las estacas aguzadas, tres empalados, la horca y
lo que tiraron desde la torre. Todo sale de unas pocas medidas (`world/level_paco.js`).

**La Corte de los Infieles.** Las puertas grandes de la sala están atrancadas por dentro: se entra **por el
servicio**, como se entraba de verdad. Del patio, por el callejón que queda entre la sala y la coracha, al **patio
de las caballerizas** (los pesebres vacíos y sus huesos: los caballos del Rey también se los comieron; las sillas
en sus potros; los perros); de ahí a **la cocina**, cuadrada y exenta, con el hogar en medio bajo la campana cónica
de la chimenea, el caldero colgado, el horno del pan y el cocinero, que sigue comiendo; y por **el paso cubierto**,
cinco peldaños arriba, al extremo bajo de la sala, tras el cancel, con la botillería y la despensa. **La Sala de
la Corte**, en alto: seis arcos diafragma de muro a muro bajo la armadura, coronas de velas, las mesas largas
contra los muros, el hogar con sus brasas, los estandartes del Rey y, al fondo, el estrado con el trono vacío bajo
su dosel y la mesa alta (y en ella el cuaderno del mayordomo). En medio, de rodillas en dos filas ante el trono,
con los cuchillos en las manos como quien lleva una ofrenda, **la corte**: veintidós cortesanos y, al pie del
estrado, el mayordomo. Al pisar el estrado, la puerta del servicio se cierra de golpe y empieza **el tambor**. Se
levantan de uno en uno, en su orden, y te rodean; **el compás manda**: en cada golpe ataca uno solo, el que el
compás señala, que alza el cuchillo un tiempo antes (se ve venir y se oye) y lo clava en el golpe siguiente; los
demás cierran el corro con los cuchillos en alto. Caen pronto (dos golpes; desviado a compás, el de gracia); si te
sales del corro, se deshace unos tiempos mientras te vuelven a rodear. Tres oleadas, siete, ocho y siete, cada una
más deprisa. Callado el tambor, **el mayordomo**, solo y en silencio, con su abrazo que no se desvía. Vencido: se
abre la puerta del servicio, las puertas grandes se desatrancan desde dentro (el atajo al patio), los cuerpos se
quedan en la sala y en el suelo queda **la llave del mayordomo**, la segunda de las cinco. Si mueres, vuelven a sus
sitios, de rodillas (`game/corte.js`, `entities/cortesano.js`).

**El Rey y el Cerco.** En la sala del alcaide, bajo el arco diafragma, sentado en un sitial de respaldo alto (con
las armas del rey, la cruz azul en campo blanco, por encima de la cabeza) ante una mesa de juego, espera **el Rey**:
un viejo enjuto, pálido y gris, de pelo y barba blancos y largos, con la corona de oro ladeada, el manto rojo forrado
de piel, una venda manchada de negro bajo el pecho, la manta sobre las rodillas y un pañuelo en la mano. Cuando sonó
la campana se arrodilló, como toda su corte, y algo le come por dentro: tose negro, tiembla y se le van las fuerzas.
No piensa darle el gusto: quiere morirse siendo él, y antes jugar una última partida a **El Cerco**, el juego que le
enseñó su padre en esa misma torre (sabe quién eres: la torre está encima de la cárcel y te oía rascar la pared).
Antes de conocerte murmura inclinado sobre el tablero; al verte intenta levantarse agarrado a los brazos del
sitial y las piernas no le sostienen.
El Cerco es de la familia de los *tafl*: un tablero de 9 × 9 con el trono en medio y las afueras alrededor; tú
llevas a los de dentro (el rey de marfil y sus ocho) y él a los dieciséis de fuera. Todo anda en línea recta sin
saltar a nadie, se mata cogiendo en medio (el trono vacío también muerde), tu rey gana si llega a cualquier
casilla de las afueras y él gana si lo atrapa (por los cuatro lados en el trono, por los tres que le quedan junto a
él, cogido en medio en cualquier otro sitio); las reglas las cuenta él y están en el pergamino de su padre (un
documento más). Se juega en una vista de cerca, sobre el tablero y con él enfrente: el cursor con W A S D (o la
cruceta; sentado, el ratón va suelto y señala la casilla que tiene debajo), E (A o el clic) para elegir la pieza y
la casilla, con las casillas posibles marcadas (las que matan, en rojo; la que sale, en blanco) y su última jugada
también; R (X) para releer las reglas, P (Start) para la pausa y Esc (B) dos veces para levantarse (a media
partida, cuenta como perdida). Él piensa en un hilo de fondo (búsqueda
alfa-beta con profundización iterativa, tabla de transposición y una búsqueda de amenazas que ve las horquillas):
juega muy bien en la primera partida y peor según se apaga. Mientras, piensa con la mano en la barbilla, alarga el
brazo tembloroso hasta la pieza (cinemática inversa, inclinándose más cuanto más lejos), la lleva, a veces titubea a
mitad de camino, y la deja con un golpe seco; comenta lo que pasa (lo que mata, lo que pierde, cuando tu rey se
asoma a una salida, cuando no puede tapar dos a la vez), recuerda (su padre, su hijo, su reina, su alcaide, Don
Gonçalo, el pequeño que estaba en la sala la noche de la campana), tose cada vez más (el pañuelo a la boca), se
adormila mientras piensa y despierta de golpe («¿Me toca?»). Se juegan **tres partidas como mucho**: si le ganas
una, se queda mirando el tablero («Ha salido»), se ríe hasta toser, coge tu rey del borde y te lo tiende por
encima de la mesa; al tomarlo se echa atrás en el sitial, cierra los ojos y ya no los abre (te deja **el rey de
marfil**: más vitalidad). Si pierdes las tres, se ríe, flojo, y se pone a colocar otra partida («Una más. La
última, te lo prometo»); a la cuarta pieza, tu rey, se le para la mano a medio camino del trono, la pieza se le
cae y él se queda doblado sobre el tablero (la pieza, **el rey de marfil**, te la quedas: un recuerdo). Después
su cuerpo sigue en el sitial y el tablero como quedó. La Plañidera que esperaba en la sala llora ahora en la alcoba.

**Las mazmorras.** Bajo el patio, todo abovedado en medio punto, con arcos fajones sobre pilastras, portadas de arco
en cada paso y bóvedas de arista donde se cruzan las galerías: el pasillo de las celdas (donde despiertas; cada celda
con su arco y su reja, que también para la cámara), el cuarto del carcelero (con la espada y el escudo) y la sala del
tormento (el potro con su condenado atado de muñecas y tobillos, la garrucha, la jaula colgada, el brasero de los
hierros). Cavadas junto a una necrópolis más antigua, las **catacumbas**: galerías de lóculos, unos tapiados y otros
abiertos con el muerto tendido dentro, un arcosolio con el sarcófago destapado y su tapa partida, y al fondo el
**osario**, una capilla de huesos con su altar de calaveras. Llegan hasta el **aljibe** del castillo, el agua de
lluvia del patio guardada para el asedio: tres naves de bóvedas de arista sobre columnas que salen del agua negra, un
andén en escuadra con su pretil (las dos puertas y el pozo, cada una en el centro de un tramo), la marca verdosa de
cuando estaba lleno en columnas y muros (ahora, a la mitad: «que nadie lave nada»), una escalera que baja del andén y
se pierde en el agua, el caño por el que entra la lluvia, un amortajado boca abajo y la luz pálida que cae por el
pozo del patio, con su cubo colgando sobre el agua. Un pasadizo, con dos celdas de castigo, lleva a un rellano bajo
la muralla y a la escalera de la **torre de la cárcel**, que sube de frente a la puerta de la torre (y se baja
igual). En la torre, la escalera de mano sube a la sala de los guardas, con sus jergones y el libro de presos.

**Lo alto del castillo.** A donde lleva el salto: la atalaya (la cabeza de la coracha, con la paja y la leña del
fanal), la coracha, un muro almenado que baja desde la muralla norte hasta el castillo con una torre en medio (y en
ella un altar), y el adarve del castillo, que entra en la torre del homenaje por su poterna, en la sala del alcaide.
Desde dentro, el torno baja el puente levadizo: el atajo de vuelta al patio.

**Una ciudad viva… de otra manera.** Bandadas de cuervos que picotean a los muertos y alzan el vuelo graznando al
acercarte, ratas que huyen por los rincones, moscas zumbando sobre los cadáveres, ropa tendida entre las casas,
rótulos de tienda, faroles, armas caídas, maniquíes y dianas en el patio de armas, estacas, círculos rituales,
piedras de catapulta y una pasada automática que acumula piedras, tejas, tablas, paja, trapos, huesos y hierbajos al
pie de todos los muros. Los crecimientos de carne nacen pegados al suelo y a las paredes y trepan por ellas.

**Progresión (metroidvania / survival horror).** Barricadas que se arrancan con la palanca, una mesa atravesada en
la cocina de la Taberna del Cuervo que se parte en dos de un golpe (acércate y pulsa E), la verja del claustro,
puertas atrancadas que solo se abren desde dentro (atajos), y bajo la Sé, un rastrillo que sube y un lienzo de muro
que se hunde, cada uno con su palanca al otro lado; una reja que necesita la manivela del rastrillo (el torno la
baja por su ranura hasta el suelo), la losa de la sacristía que hunde el anillo del arzobispo, las ventanas que se
tapian con martillo y tablones, la Puerta del Dios Ignoto con sus cuatro cerrojos, altares de descanso que curan,
rellenan las ampollas y devuelven a las criaturas a sus puestos. Las puertas atrancadas muestran la tranca por el
lado desde el que se quita; las puertas escondidas no se ofrecen ni salen en el mapa hasta que se abren. Mejoras
opcionales: ampollas vacías, relicarios de hueso (vitalidad), una piedra de afilar bendita (daño) y el rosario del
canónigo (aguante), que deja el Descoyuntado al morir. Casi cincuenta documentos breves cuentan la historia junto con
el escenario; cada uno se lee como está escrito y, con T (X en el mando, o desde las opciones), con su transcripción
al lado, en letra de leer.

**El inventario**, a lo Dark Souls, en tres pestañas. El **Equipo**: las ranuras de la mano derecha (el arma), la
izquierda (el escudo), las cuatro de la armadura (cabeza, torso, manos y piernas: aún no hay ninguna pieza en el
mundo, pero sus ranuras y lo que paran ya están), el objeto bendito y la ampolla; en cada una se elige qué ponerse de
lo que se lleva encima, o nada, y se puede ir desarmado o sin escudo (se guarda con la partida). Los **Objetos**, por
clases (consumibles, armas, escudos, armaduras, objetos benditos, objetos clave y mejoras), desde donde también se
pone y se quita lo que se lleva puesto. Y los **Documentos**. Todo se maneja con teclado, mando o ratón (se pinchan las
casillas, las pestañas y las teclas de la ayuda).

**Los osarios y los objetos benditos.** Cuatro osarios, cada uno con su gente y su manera de ordenar los huesos,
guardan un **objeto bendito** tras un puzle con su pista en un documento. Los objetos no suben números a secas:
**favorecen una manera de pelear y castigan otra**, y se lleva uno a la vez (se pone y se quita en el inventario; su
icono va junto a la vida).
- **El osario de la Hermandad** (catacumbas del castillo), el de los soldados: calaveras con yelmo en sus filas,
  escudos y armas. *El toque de alba*: cuatro yelmos colgados, cada uno con su nota, que se tañen en el orden en que se
  pasa lista. Guarda la **Saeta de San Sebastián** (la guardia: bloquear cuesta la mitad de aguante, lo que paras no
  te hiere y tu siguiente golpe hace más daño; a cambio, volteretas caras y cortas y un parry casi la mitad de
  breve).
- **El osario del canónigo** (sus bodegas): la nana del ama. Una caja de música de cuatro rodillos con símbolos; cada
  prueba suena por toda la bodega (y el Descoyuntado viene a ver). Guarda el **Escapulario del ama** (la esquiva:
  voltereta más larga y barata, y esquivar en el último instante detiene el tiempo y deja un crítico; a cambio, un
  tercio menos de vida y bloquear cansa más).
- **El osario de las Ánimas** (cripta de la Sé): óbolos en la boca de las calaveras y los nombres de los muertos en sus
  lápidas; hay que llevar al cepillo los de las ánimas que nadie nombra. Guarda el **Óbolo de las Ánimas** (aguantar
  golpeando: la vida que te quitan se recupera golpeando y tus golpes son más rápidos; a cambio, las ampollas curan
  la mitad y recibes más daño).
- **El osario de los hermanos de Dumio** (cripta de San Martín): los monjes, de pie en sus nichos con su hábito, bajo
  arcos de herradura de fémures. Hay que volver la cara de cada uno hacia lo que guarda. Guarda el más fuerte, el
  **Cerrojo de San Martín** (el desvío: un parry mucho más amplio que devuelve el aguante y desequilibra antes a los
  grandes, y el golpe de gracia hace el doble; a cambio, no se puede bloquear).

**Parry.** Pulsar la guardia justo antes de que llegue un golpe lo desvía: no hace daño, saltan chispas, el acero
canta, hay un parón seco y un destello, y te vuelves hacia quien te ataca. La ventana dura 0,2 s (la katana, 0,24;
el hacha, que para con el mango, 0,16) y machacar el botón la acorta. Cada familia de arma tiene sus animaciones de
desvío, dos que se alternan en los combos de varios golpes: con escudo (facón, lanza, espada) lo saca hacia fuera
apartando el golpe o lo alza para desviarlo hacia arriba, con el arma atrás, lista; a dos manos barre el golpe con
la hoja (o con el mango del hacha) hacia uno u otro lado. Mantener la guardia sigue siendo bloquear.
Tras un parry la criatura queda **desequilibrada**, cada una con su animación (la hoz o la espada despedidas hacia
atrás, el escudo abierto, el cuerpo de lado, la campana que se le va), y abierta al **golpe de gracia**: con el
ataque ligero te lanzas hacia ella y le clavas una estocada (o un hachazo) que entra seguro, crítica, con un parón
largo, un instante a cámara lenta y la cámara cerrándose sobre el golpe. A las pequeñas les basta un parry; el
Campanero necesita dos seguidos y los jefes tres (mientras, el desvío sólo les corta el golpe); al arzobispo se
le devuelve el incensario. El Descoyuntado se echa atrás chillando y, con la postura rota (dos parrys al acecho,
tres enloquecido, cuatro en frenesí), cae patas arriba; aprende si desvías a menudo (amaga, se queda arriba hasta
que se te cierra la ventana y prueba los golpes que no se desvían) y sus huesos lanzados se apartan de un golpe.
**Los golpes que no se pueden desviar** avisan con los ojos en rojo, un destello rojo en la cabeza y un toque grave:
los que llevan todo el cuerpo detrás (saltos, cargas, giros, agarrones, caer del techo, el tercer brazo del soldado),
las ondas de choque y los tañidos, el fuego y los lamentos de la Plañidera. Se bloquean o se esquivan.

**Combate Soulslike simplificado.** Ataque ligero en combo, ataque pesado que rompe guardias, ataque a la carrera,
bloqueo con coste de aguante (y rotura de guardia), esquiva con fotogramas de invulnerabilidad, curación con
animación, *hitstop*, golpes críticos, estela de la espada, retroceso y estremecimiento de las criaturas, aviso en
los ojos antes de sus golpes, vibración del mando, *poise*, un *buffer* de entradas y cancelación de la recuperación
al moverse. Las criaturas te siguen por escaleras, rellanos, adarves y de un piso a otro (navegación por capas: en
cada celda, las superficies donde se puede estar de pie, unidas si se pasa de una a otra andando como el cuerpo,
peldaño a peldaño), no te atacan al aire desde abajo y no se tiran por los bordes. El fijado elige al enemigo que
tienes delante (con línea de visión) y la cámara lo encuadra con un barrido suave, sin saltos. Bajo techos bajos y
vigas la cámara se agacha en vez de atravesarlos; contra los muros mide con un haz de rayos y guarda holgura a su
alrededor (no se ve a través de paredes ni rejas), y de espaldas a una pared, en vez de meterse en ella, sube sobre
la cabeza y deja de dibujar el cuerpo.

**Animación procedural.** Clips con interpolación de Hermite y mezcla por cuaterniones, marcha bípeda con zancada
ajustada a la velocidad, balanceo de cadera, inclinación en las curvas y cinemática inversa de dos huesos en piernas
(los pies se apoyan en el suelo y en los escalones) y brazos; los escudos se estabilizan para mirar siempre al frente.
El brazo del escudo lo lleva con soltura (muelles de guiñada, cabeceo y alabeo, y mezcla de las poses de guardia,
marcha y carrera) y, si aun así fuera a meterse en el torso, la hombrera, la cadera o la pierna, se aparta; al trotar
y correr la hoja va por delante.

**Armas.** Cinco armas, cada una con su modelo, su estela, sus sonidos y su repertorio completo (combo ligero,
pesado, ataque a la carrera, ataque al salir de la voltereta, guardia, bloqueo y curación). Por el orden en que se
encontrarán:
- **Facón criollo** (una mano, con escudo; no cuadra con la historia: quedará como huevo de pascua): agazapado, cuatro cortes cortos que se encadenan (tajo, revés con el
  contrafilo, tajo corrido y puñalada), molinete de dos tajos y puñalada a fondo; hiere más por la espalda.
- **Hacha barbada** (dos manos, el escudo a la espalda; se para con el mango): golpes lentos y demoledores que
  desequilibran a casi cualquiera, barrido con las manos deslizándose por el mango y un hachazo del verdugo que se
  carga manteniendo el botón, rompe la guardia y parte el suelo con una onda.
- **Lanza de la muralla** (una mano, con escudo): estocadas largas y rectas, un barrido con el asta y una estocada
  que se lanza sin bajar el escudo.
- **Espada del carcelero**: la de siempre, sin cambios.
- **Katana sagrada** (dos manos; también para un huevo de pascua): kesa-giri, kiriage, corte horizontal y tsuki; *iaijutsu* (desenvaina de la saya
  al cinto y corta en un gesto, con destello sagrado; también se carga) y un *makko* vertical.
- **Ballesta de estribo** (dos manos, el escudo a la espalda; está en el taller de la torre del homenaje): el ataque
  ligero la alza a la cara y tira un virote, que vuela recto y deprisa (cae un poco), se clava donde da y tumba a las
  criaturas pequeñas; fijado un objetivo, va a su pecho. Tras el tiro se monta sola, con el pie en el estribo y las
  dos manos en la cuerda hasta la nuez: casi dos segundos quieto y a merced (si te golpean, se pierde). El pesado es
  un culatazo. Los **virotes se cuentan** (junto a las ampollas, con una raya dorada si está montada) y por ahora
  sólo los hay en el castillo: en el pañol, en el taller, en el cadalso y en el carcaj del alférez. También cortan
  cuerdas.

Las cuatro nuevas ya están en los datos (objetos, iconos, modelo recogible; al recogerlas se empuñan y el arma
queda guardada en la partida) pero aún no están colocadas en el mundo. Para probarlas: `?dev=1&arma=facon`
(o `hacha`, `lanza`, `espada`, `katana`).

Sus animaciones siguen la estructura de un golpe real: anticipación que frena, impacto que se cruza a la velocidad
máxima y final del tajo que frena desde ahí (una sola campana de velocidad, sin paradas ni rebotes: tangentes
monótonas), con retrasos escalonados de cadera, pecho, brazo y hoja. El filo va por delante: el giro de la muñeca
se calcula fotograma a fotograma a lo largo del arco real de la hoja (sin medias vueltas bruscas cuando la hoja se
alinea con el antebrazo) y el codo se elige para que la muñeca quede natural. Las estocadas se definen en el espacio del personaje para ir rectas aunque el torso gire; a dos
manos, el puño izquierdo se coloca exactamente sobre el mango (y se desliza por él si el brazo no llega). Las
ventanas de golpe salen del perfil de velocidad de la punta y cada golpe del combo empieza en la pose exacta en que
se encadena el anterior.

**Criaturas.**
- **Penitente**: flagelante encapuchado, con clavos en la espalda y una hoz oxidada.
- **Soldado cosido**: yelmo reventado por la carne y un tercer brazo que brota de la espalda; bloquea con el escudo.
- **Rastrero**: cuerpo supino que camina a cuatro patas como una araña; embosca desde los techos.
- **Mastín desollado**: perro sin piel con la mandíbula abierta; caza en pareja.
- **Campanero**: bruto de casi tres metros con una campana de la catedral por cabeza, fundida sobre los hombros
  (el bronce chorreó sobre la carne) y encadenada al pecho, con lo que queda del yugo encima y los ojos brillando
  por dos rendijas; delantal de fundidor, la cuerda de la campana a la cintura y el badajo por maza. Se da un
  puñetazo en la campana para avisar y para el tañido que aturde; alza el badajo por el costado y lo descarga (la
  onda sale donde da la bola) o barre por delante a la altura del pecho. La campana se vuelve hacia ti, vibra
  cuando suena o le hieres, y se agacha para pasar bajo los dinteles.
- **Plañidera**: una muerta altísima que flota amortajada, con un velo de encaje que le cae por la espalda, la cara
  cerúlea de cuencas vacías y lágrimas de sangre, mechones negros, la mancha del corazón en el corpiño y un
  rosario; brazos que le llegan al suelo, con mangas que cuelgan y dedos larguísimos, y una falda de paños rotos
  que ondea sin tocar el suelo (al morir se extiende por él). Se le descuelga la mandíbula al gritar y el lamento
  espectral le sale de la boca.
- **Cavador** (las catacumbas de la Sé): el fosor que abrió las galerías y no dejó de cavar. Se le oye antes de verlo
  (el pico contra la piedra) y se le ve por la vela pegada a la frente y la lucerna del cordón; lleva a la espalda un
  cuévano de calaveras. Descarga el pico de arriba abajo, barre de lado y, si lo clava en el suelo, la bóveda suelta
  piedras.
- **Emparedada** (las catacumbas): la reclusa tapiada en vida, a la que la pared se tragó de cintura para abajo y que
  arrastra la obra. Máscara de yeso con un solo ojo y el ventanuco enrejado del pan; espera de cara a los nichos con
  las manos en la piedra. Agarra, araña y se deja caer con todo el peso de la obra.
- **Enrodado** (las catacumbas): el reo quebrado en la rueda y enterrado con ella, trenzado entre los radios. Se echa
  atrás, aúlla y embiste rodando en línea recta (esquivado, se estrella contra el muro y queda aturdido); se retira
  rodando para coger carrerilla, da zarpazos con el brazo suelto y se vuelca encima.
- **Coronado** (las casas del barrio de los Pellejeros): un vecino que el Físico encontró sano y curó. Le abrió el
  cráneo y le atornilló una corona de hierro para que la herida no se cerrase, con un cascabel en cada varilla (el que
  lleva cascabel no se esconde); le cosió un ojo y le ató la boca con una correa. Va en camisón de lino sucio,
  descalzo, con los brazos vendados de las sangrías y la cruz de cal a la espalda, la cabeza vencida por el peso de la
  corona. No está infectado: está curado. Si te ve, sacude la cabeza: los cascabeles suenan por todo el barrio y el
  Físico viene. Garfio, embestida y agarrón (te sujeta para que llegue él).
- **Cuervo cebado** (los tejados del barrio de los Pellejeros): un cuervo que comió tanto de los muertos que creció como un perro,
  con dos metros de alas, la pechuga pelada, el pescuezo desnudo lleno de bultos, tres pares de ojos y el pico
  ganchudo como una reja. Se posa en lo alto y mira (estos sí ven; bajo techo, no): grazna, se tira, vuela en círculos
  sobre ti, se queda en el aire con las alas arriba y chilla, y se lanza en picado. Ruédate o desvíalo: desviado, cae
  aturdido al tejado, a merced del golpe de gracia. El golpe empuja (cuidado con el alero). A veces se posa cerca y
  da picotazos.
- **Mestre Clemente, el Físico de los Inocentes** (jefe del barrio de los Pellejeros): el médico de los locos de
  Braga, que la noche de la campana vio a sus inocentes quedarse quietos, curados por la carne, y entendió que la
  peste son los signos de los sanos (el pulso que corre, los ojos abiertos, el esperar). Ropón encerado, guantes,
  sombrero de ala ancha y la máscara de pico con dos ojos de vidrio; habla bajo, despacio, en frases que parecen
  versos. No es una criatura que espera en su sitio: el barrio es suyo y lo recorre. Te vigila desde que entras (la
  cortina, el fondo de la calleja), clava las puertas de las casas en las que te metes, pone cepos entre la paja (los
  pone donde más has pasado) y cuerdas con campanillas; lo que suena (un cascabel, una campanilla, un cepo, una puerta
  arrancada) le trae, por la puerta de una de las casas que ya curó, la que no ves; te busca donde estuviste, te huele
  por el pico y, por los tejados, te sigue desde la calle sin quitarte los ojos de encima. No quiere matarte: quiere
  curarte. La vara del gancho te trae; la esponja de beleño te duerme (forcejea); herido, te echa cal viva a los ojos
  y se retira. Si te duerme, la camilla: despiertas atado boca arriba mientras te lleva por la calleja hasta su
  quirófano, donde te toma el pulso y se va a la fragua a poner el cauterio al rojo; tres correas, machacando, antes
  de que vuelva, o el hierro. La pelea, en su quirófano, en los tres tiempos de su aforismo: las medicinas (la vara,
  la esponja, el sahumerio de beleño, que todo lo vuelve lento, y la campanilla, que llama a dos Coronados); el hierro
  (a media vida se quita la máscara: debajo, la cara lavada y en la frente el agujero de su propia trepanación; la
  sierra, la lanceta y el trépano, que te taladra si te coge); y el fuego (los cauterios del brasero, que prenden la
  paja del suelo). Vencido, se sienta en el canto de su mesa y se toma el pulso: «…y lo que el fuego no cura…
  *insanabilia*».
- **El Empalado** (jefe menor) y su segunda forma, **la Bestia de Carne** (ver arriba).
- **El Descoyuntado** (jefe opcional, en las bodegas del canónigo): el canónigo, boca arriba sobre cuatro miembros
  descoyuntados, con la sotana hecha jirones, la cabeza del revés y la mandíbula suelta. Su cuerpo es procedural:
  cada miembro es una cadena de dos huesos con cinemática inversa y pies que se plantan en el suelo o en el techo y
  sólo se despegan cuando se estiran demasiado; tiene tres andares (al acecho, bajo y con pausas; al paso, en
  diagonal; y al galope), el tronco en dos mitades que se tuercen y se doblan, costillas que respiran, dedos que se
  cierran y se abren, jirones que cuelgan siempre hacia el suelo (también boca abajo, en el techo) y una cabeza que
  escudriña, se tuerce sola y tiembla de rabia. Cada golpe tiene preparación, golpe y recuperación con inercia:
  zarpazo, doble zarpazo, barrido bajo, las dos manos contra el suelo (onda de choque), mordisco con el cuello
  estirado, salto, carga al galope, giro con los brazos abiertos, agarrón con mordiscos (se forcejea para soltarse),
  el crujido de todas sus articulaciones, huesos lanzados y las dos manos contra lo que te esconde (un sepulcro, un
  santo, un tonel); esquiva con voltereta hacia atrás, salto atrás o de lado, para tus golpes con los antebrazos
  cruzados y contraataca, cae de espaldas pataleando cuando se estrella contra la piedra o te sueltas de su agarrón
  (patas arriba, todo golpe es crítico) y muere a pedazos (se le parten los miembros uno a uno y, al final, la
  cabeza se le da la vuelta). No se queda atascado: si algo le cierra el paso, lo arranca o lo revienta.
  Primero **acecha**: te observa desde la bóveda, se asoma por las esquinas, imita tus pasos y la voz del ama, se
  ríe y te tira huesos, y te embosca cuando le das la espalda, te curas, lees o echas una palanca. Se adelanta a
  sus **puestos de emboscada**, en la bóveda nada más pasar cada arco o puerta (el dintel lo tapa hasta que estás
  debajo) y en mitad de los pasillos largos: se queda colgado, quieto y a oscuras, y si pasas por debajo sin mirar
  arriba (y antes si vas corriendo) **te cae encima**: un chillido, polvo, su sombra en el suelo y la caída adonde
  vas a estar. Si te alcanza te derriba de espaldas y se te queda encima mordiendo: forcejea para quitártelo de una
  patada (y cae de espaldas). Si le ves a tiempo, se escabulle; si ruedas, se estrella contra el suelo y tarda en
  rehacerse. Si no vienes hacia su puesto o te paras, no se queda esperando: va a por ti por la bóveda. A ratos **te
  sigue**: va por tu propio rastro, por la bóveda o agazapado, a unos nueve metros, a tu paso; se le oye respirar,
  crujir o repetir tus pasos, cae polvo del techo; si te vuelves y le ves, se queda quieto, le brillan los ojos un
  instante y se aparta despacio de tu vista; si vas hacia él, o se te echa encima o se escabulle. Se mueve por las
  bodegas por sus **grutas**: túneles que ha excavado en la roca, con la boca rota, tierra amontonada, huesos y
  arañazos, que comunican salas lejanas. Se agacha, se agarra a los bordes, se mete a rastras de un tirón con los
  miembros abiertos como un lagarto, se funde con lo oscuro del túnel y sale por otra; antes de salir, en el fondo
  del túnel, sólo se le ven los ojos. Al
  esquivar nunca salta hacia la escalera, un desnivel o la roca, y si algo le saca del suelo de las salas, vuelve
  al último sitio seguro. Tras cada emboscada se queda a pelear un rato. Cada emboscada que le sale mal (la
  esquivas, la paras, le ves venir, le hieres, te sueltas de su agarrón) le frustra; cuando se harta, cuando le has
  hecho bastante daño o cuando echas la tercera palanca, **enloquece**: viene a por ti, se alza, grita y golpea el
  suelo, y ya no se esconde. Enloquecido prefiere pelear en sitios abiertos
  (si te metes en un pasillo, te espera un momento en la bóveda de la salida, o a lo ancho golpeando el suelo, y si
  no sales entra a por ti) y te lee: aprende qué haces y qué
  sueles hacer después de qué, cuántos golpes tienen tus combos y hacia dónde ruedas cuando te ataca, y lo usa para
  apartarse de un salto cuando vas a golpear y castigarte en la recuperación, cruzar los brazos para parar el resto
  de un combo que ya conoce, adelantarse con un mordisco cuando sabe que vas a atacar y apuntar su segundo zarpazo
  adonde sueles esquivar. Con poca vida entra en frenesí. Su barra sólo aparece cuando pelea contigo.
- **El jefe final: la Película**, una película jugable a lo *God of War*, casi toda cinemática, con pulsaciones
  rápidas y tramos jugables muy guiados (diseño en `PLAN_JEFE_FINAL.md`). En la cisterna **se pelea de verdad contra
  el arzobispo**, que espera de rodillas en la fuente, cara a la estatua, y ya anuncia lo que viene: cuatro metros de sacerdote enjuto
  con joroba de buitre y la cabeza colgando de un cuello larguísimo, por cara una jaula de hierro con púas (detrás,
  dos brasas y los dientes), la mitra partida en dos y clavada en dos cuernos de hueso, la aureola de hierro con
  siete cirios que chorrean, la casulla carmesí abierta sobre el pecho de costillas con el núcleo que arde y el
  grillete del incensario; vencido, el **rito**: la carne del dios le envuelve y en su lugar se alza **el Turiferario**, un
  gigante de carne de 21 metros con la campana mayor encadenada a la mano, que revienta la cúpula, sale por el
  cráter, atraviesa la muralla y revienta la nave de la catedral detrás de ti. Seis actos: **la transformación** y
  la nave que se viene abajo; **el agarrón** (te atrapa, te ruge a la cara y te lanza por encima de la ciudad a la
  paja de un establo); **la Herrería**, la huida, con las casas reventando en ola a tu paso y la campana
  descargada donde estabas (un adoquín revienta la puerta atrancada de la torre del oeste de la puerta sur, y
  se sube por su husillo y por la escala de la sala de los guardas hasta la trampilla del cadalso); **la
  primera espringala**, en esa torre (cargar el torno, apuntar con el virote
  que cae y disparar: se tapa con el antebrazo y el virote se le clava) y el primer momento *God of War*: saltas
  a la cadena tensa y corres por ella hasta su brazo (se afloja bajo tus pies y da un latigazo al tensarse: hay
  que saltar por encima), le apuñalas la mano y la torre revienta; **la cabalgada**, colgado del virote mientras
  cruza la ciudad corriendo (las casas del centro, el arco de la Sé, el mordisco, la fachada de la catedral, la
  nave y las almenas de la brecha); y **la segunda espringala**: se cura en la sangre negra que hierve en el
  cráter, subes a la torre del oeste de la brecha y le clavas el virote en la nuca. El segundo momento *God of
  War*: su cara a dos metros, el salto a la jaula, el ojo; y **el corazón del dios**: los virotes no le matan,
  le derriban. Retrocede hacia el cráter contigo en la cara: trepas por la jaula hasta lo alto de la cabeza,
  aguantas mientras se revuelve (la aureola se le arranca y cae entera al campo, con sus cirios), bajas a la
  joroba y le hundes el virote de la nuca con todo el cuerpo encima; se ahoga sin voz y cae de rodillas al
  borde del cráter, con el pecho abierto como dos puertas y el núcleo latiendo a la vista. Saltas por encima de
  la mano que viene a por ti y resbalas por la casulla hasta el corazón, te descuelgas cuando junta las manos
  para aplastarte contra su propio pecho, y lo apuñalas hasta que revienta: la luz, la onda, el silencio.
  Muerto, cae de espaldas al cráter y la sangre negra se lo traga; amanece, y el final de siempre, en el río.
  Lo que revienta a su paso se viene abajo de verdad: las casas, la cúpula y lo alto de las torres se ladean y
  se hunden, sueltan trozos de su propia piedra, madera y teja y levantan polvo del color de la luz que hay;
  los derrumbes y los rugidos se hornean una vez y suenan como muestras, para que el audio no se corte ni se
  sature con una manzana entera cayendo a la vez. Fallar una pulsación en una
  cinemática hace daño pero no mata; puntos de control en el rito, el establo, la torre sur y la muralla.
  **Deo Ignoto** queda como jefe opcional para más adelante: hará falta un objeto verdadero que todavía no
  existe (ver `finale/director.js`). Los colosos se esculpen por código en un *Web Worker* al cargar el juego,
  con esqueleto, piel, muelles (la cola, la ropa, los jirones), cinemática inversa y la campana con su cadena
  simuladas. Lo que la película enseña de cerca va aparte y más fino: las manos (tres falanges, nudillos
  huesudos, tendones, venas y uñas de hueso) y la cara tras la jaula (dos brasas por ojos, la nariz podrida,
  los labios rotos, los dientes largos y la mandíbula desencajada). Lleva la catedral encima: un fajón partido
  en la joroba, sillares clavados en la carne, vigas y tejas, la corona de velas encendida en un cuerno y el
  estandarte negro del presbiterio prendido en la aureola.

**Estética PS1/PS2 hecha a mano con shaders.** Render a baja resolución con escalado entero *nearest*, vértices
ajustados a la rejilla de pantalla y mapeo afín opcionales (por defecto desactivados para que el suelo no tiemble),
filtrado anisótropo, color de 15 bits con tramado Bayer, niebla que se funde con el color del cielo, niebla
exponencial más niebla volumétrica por *raymarching* (bancos que se arrastran por las calles), *bloom* de fuego,
iluminación horneada por vértice (antorchas, velas, vidrieras) combinada con un pool de luces dinámicas
parpadeantes, ceniza cayendo, brasas, humo, sangre, sombras de mancha, filtro CRT opcional y siluetas en la niebla.

**Rendimiento.** Lo que no se ve no se dibuja. Lo que queda entero bajo la calle (la cripta, las bodegas, las
mazmorras) no se dibuja con la cámara en la calle, salvo cuando se ve uno de los huecos que llevan abajo (las
escaleras, el cráter, el río) o la cámara está junto a él: lo demás lo tapa la losa de tierra de la calle. Tampoco se
dibujan las criaturas ni los objetos de muchas piezas (rejas, puentes, puertas) que tapa un muro. En la calle se
dibujan así, según el sitio, entre un 14 y un 54 % menos de triángulos, y hasta un 47 % menos de llamadas de dibujo.

**Interfaz en pixel art.** Todos los menús se dibujan con sprites generados por código a resolución de arte y
escalado entero: marcos de hierro con esquineras doradas, estandartes carmesí con espadas como cursor, una gran espada
en la portada, pergamino rasgado con capitular iluminada y lacre para los documentos, iconos 32×32, mapa sobre
pergamino, teclas dibujadas (los clics, un ratón con el botón encendido; en el mando, cada botón con su forma) y
un HUD pintado píxel a píxel. El texto usa fuentes pixeladas (Jacquarda Bastarda 9, Handjet, Silkscreen y Jacquard)
siempre a múltiplos exactos de su rejilla para que se vea nítido.

**Música adaptativa, compuesta por código.** Cada zona tiene su tema, con su modo, tempo e instrumentos, y tres
capas que se funden según lo que pasa: exploración, tensión (clúster de cuerdas en trémolo, latido y susurros cuando
algo acecha) y combate (tambores de guerra, pandero, metales y ostinato cuando te persiguen). Las calles suenan en
mi frigio con dron grave, coro lejano, zanfona y salterio; la muralla, con cuernos y los tambores de los sitiadores
al otro lado; las casas, con una caja de música olvidada; las capillas con altar, con órgano de flautado y un coro
en paz (ahí no entra la tensión); la catedral, con órgano lleno y canto gregoriano; la cripta, con drones sordos y
coros disonantes. El Empalado tiene su propia percusión de guerra en frigio dominante (más rápida en la segunda
fase, y desbocada en la huida de la Bestia); el Descoyuntado, la caja de música de las casas rota y desafinada sobre tambores en 7/8, chasquidos de hueso
y un coro que salmodia en una sola nota (y, mientras te caza, un latido lento en 7/8 con la caja de música a medio
sonar, clústeres de cuerda y susurros), y el Turiferario, un órgano de lengüetería y un coro que canta el *Dies
irae*. La portada es canto llano en
*organum* con campanas y el amanecer, un coro y un arpa en mayor. Hay golpes de efecto al ser descubierto, al
descubrir una zona, al descansar, al cruzar la niebla, al morir y al vencer. Los instrumentos se sintetizan en
directo: órgano con registros, coro con formantes, cuerdas, zanfona, metales, salterio y arpa por Karplus-Strong,
campanas aditivas y tambores.

**Sonido 100 % sintetizado (WebAudio).** Reverberación por convolución con salas generadas (calle, habitación,
capilla, catedral, cripta, exterior) que se funden al pasar de una a otra; sonidos 3D con absorción del aire por
distancia y oclusión (lo que suena tras un muro llega apagado); pisadas según el suelo (piedra, madera, tierra) con
el tintineo de la cota de malla y golpe al aterrizar; filos que silban, carne, hueso, escudos y metal; puertas que
chirrían, cerrojos, trancas, tablones, rejas con cadenas y la losa del sello; voces de criaturas con formantes,
aspereza y temblor (rezos que se oyen antes de que te vean, jadeos, sollozos, gritos); ambiente por capas (viento a
rachas y silbando en las almenas, el rumor de la ciudad en llamas, fuegos posicionales, moscas, el acorde cálido de
los altares, el río) y sucesos de cada zona (campanas lejanas, gritos, perros, vigas que se desploman, procesiones,
cuernos, ratas, gotas en la cripta, pasos que no son tuyos en la catedral, pájaros al amanecer). La música se atenúa
con los golpes fuertes y se oye «tras una puerta» en la pausa.

**Mezcla que no se satura.** Todo pasa por un limitador que solo actúa cerca de 0 dBFS y un recorte suave de
seguridad: nada sale nunca por encima de 0 dBFS y la mezcla no «bombea». Un presupuesto de voces decide cuántos
sonidos de cada clase suenan a la vez (pasos y voces de criaturas, golpes, ambiente, los del jugador): en una horda
entran los más cercanos e importantes, los más débiles se apartan con un fundido breve, el mismo golpe repetido en el
mismo instante no se apila y los gritos de muchas criaturas a la vez se escalonan en fotogramas sucesivos. El
panorama y la distancia se calculan una vez por sonido (y unas pocas veces por segundo los largos, que siguen a la
cámara) en lugar de con un `PannerNode` que, con el oyente moviéndose en cada fotograma, se calcula muestra a
muestra. Cada sala de reverberación se crea una sola vez y se reutiliza, los cambios de zona esperan un instante a
que la zona se asiente (en un umbral no van y vienen) y, como mucho, un tema musical se funde con el siguiente.
Lo que costaría un tirón en pleno juego (salas, campanas, tambores, el fuego, cadenas, gotas y las notas de cada
tema) se calcula en los ratos libres: la pantalla de título o los segundos que espera la música al cambiar de zona.
Las partes de un sonido que empiezan más tarde (los huesos de un alarido, los cascotes de un derrumbe) se crean
poco antes de sonar, no todas de golpe.

## Modo desarrollador

**F2** (o tecleando en cualquier momento la contraseña del modo de pruebas, que el código no guarda en claro: sólo su
huella) abre un panel para probar el juego: invulnerable, aguante infinito, volar atravesando muros (WASD según la
cámara, Espacio sube, C baja, Mayús deprisa), velocidad del jugador y del juego (cámara lenta), IA congelada o
ciega, el estado de cada criatura sobre su cabeza, los puestos del Descoyuntado en el mundo (emboscadas en rojo,
perchas en azul, grutas en verde, palancas en amarillo), órdenes al Descoyuntado (traerlo, que te siga, emboscada,
caza, gruta, enloquecer, calmar, matarlo), curar, todas las armas y objetos, cambiar de arma, teletransporte a cada
zona y altar, guardar y volver a una posición, la ventana de parry en pantalla y un registro de parrys y golpes de
gracia. Con el panel abierto el ratón es del panel; un clic en el juego lo cierra.

- **Diseño:** ir a la estatua (a la boca del Círculo) o al principio del Pasillo de los Gigantes, abrirle o
  cerrarle el ojo a mano, ver la introducción o la crónica (vuelven al título) y poner la crónica en el menú del
  título.
- **Instancias:** ir directamente a un momento de una pelea, con las banderas como estarían en una partida: el
  arzobispo en la cisterna, cada acto de la película del jefe final (el rito, del cráter a la nave, el agarrón,
  la Herrería, la primera espringala, la cabalgada, la segunda espringala y el final), el río al amanecer; el
  Empalado, la huida de la Bestia y la caza del Descoyuntado; la defensa de la Casa del Alemán y Leonor; el
  pasadizo del Soto con un tablón en la mano, y Miguel, en su rincón o ahorcado; y en la cripta honda, el Custodio
  de la Garra, los Velados, Dom Paio en el pozo y la Puerta del Dios Ignoto con todo listo para abrirla.
- **El jefe:** matar el sigilo que toca, saltar de fase y ver las rutas de trepar (de las peleas de colosos de
  antes; la película no los usa).
- **Editor:** una cámara libre que se separa del jugador (WASD, ratón, Espacio y C), detener el tiempo, llevar al
  jugador al punto al que apunta la cámara y leer las coordenadas de la cámara y de ese punto.

Desde la consola: `__game.dev.instance('deoMascara')`, `__game.dev.act('skipPhase')`.

Sólo se abre en el propio ordenador (localhost: `npm run dev`) o desde la IP del autor: en `src/dev/access.js` se
guardan las huellas (PBKDF2-SHA256) de las IP autorizadas, nunca la IP. Al pulsar F2 en la versión publicada se
pregunta la IP pública a un servicio externo y se compara su huella; si no coincide, el panel no aparece. Sin
huellas en la lista no se pregunta nada, y quien no pulsa F2 no contacta con nadie. La huella de tu IP se saca con
el botón «Huella de mi IP» del panel (en localhost) o, en la consola, `__game.dev.ipHash()`. Desde la consola
también: `__game.dev.set('god', true)`, `__game.dev.act('rage')`, `__game.dev.tp('lagar')`, y
`__game.culling.on = false` para dibujarlo todo (sin ocultar lo que no se ve; `__game.culling.stats` dice si se
dibuja el subsuelo y cuántos objetos se han quitado).

## Estructura del código

```
src/
  main.js               arranque y bucle
  core/                 entrada (teclado/ratón/mando), utilidades, ruido y audio:
                        audio.js (mezcla, efectos, ambiente), audio_music.js (música adaptativa),
                        audio_lib.js (síntesis: salas, cuerdas pulsadas, campanas, tambores)
  gfx/                  texturas procedurales, materiales PSX, post-proceso, efectos, geometría fusionada
                        y agua (water.js: la cisterna y el pozo)
  world/                colisión, rejilla transitable, arquitectura, atrezo, detritos y el mapa de Braga
                        (level_canon.js: la Casa del Canónigo; level_cellar.js: el laberinto de sus bodegas,
                        generado por regiones: suelos, bóvedas, muros, pilares, grutas (madrigueras), posaderos,
                        palancas y el rastrillo; level_walls.js: la muralla norte y el recorrido de la huida;
                        level_barrio.js: el barrio de los Pellejeros (la calleja, la plazuela, el portón, sus
                        casas y sus calles), con kit_casa.js, el kit de las casas (muros con sus huecos, puertas,
                        ventanas, forjados, escaleras, tejados que se andan), barrio_casas.js (el zapatero, la
                        cerera, la quemada, la tintorería, por dentro), barrio_atrezo.js (lo de los oficios y lo
                        del Físico), barrio_tejados.js (la viga de la calleja, el palomero y su palomar),
                        inocentes.js (la Casa de los Inocentes y su patio) y cordeleria.js; level_fragua.js: la
                        fragua del maestre Lourenço;
                        level_castle.js: el castillo y las mazmorras; level_torre.js: la torre del homenaje,
                        generada por medidas (estancias, zonas, forjados, escaleras); rey_mesa.js: la
                        mesa del Rey (el tablero del Cerco, su sitial, el banco, las velas y el brasero);
                        level_keep.js: la atalaya y la coracha; level_paco.js: el Paço del Rey (su recinto,
                        el foso del Rey, el puente, la puerta, el patio, la sala y el servicio), generado por medidas; level_postigo.js: el Callejón del Postigo, la Casa del Alemán (con su
                        sobrado y su escalera), su sótano y la gruta de Leonor; level_souto.js: la casa tapiada, el pasadizo del Soto y
                        la casa del tonelero; level_crypt2.js: la cripta honda, una planta de salas
                        (San Martín, las catacumbas, los Inocentes y el relicario, los Mártires, la antesala
                        y el pozo) de la que salen muros, suelos, navegación y mapa; sanctum.js: lo que hay tras
                        la puerta del dios (el Paso, el Pasillo de los Gigantes, el Círculo con la fuente, la
                        sima de la estatua y la galería del río); panteon.js: el Panteón
                        de los Obispos y la galilea; lucernario.js: el Lucernario de San Pedro de Rates;
                        osario_martin.js: el osario de los hermanos de Dumio; ossuary_props.js: las piezas
                        de los osarios (calaveras, yelmos, la caja de música, los monjes, los obispos
                        yacentes) que sirven igual para hornearlas en el mundo que para moverlas)
  dev/                  el modo desarrollador (devmode.js), quién puede abrirlo (access.js), las instancias de
                        las peleas y los controles del jefe (instances.js), el editor (editor.js) y el
                        laboratorio de los colosos (colossus_lab.js)
  entities/             rig articulado + animador, locomoción con IK, jugador, criaturas e IA; colossus/: el escultor
                        de los colosos (sculpt.js), su modelo con piel (model.js), el Turiferario (turiferario.js; sus
                        manos y su cara, esculpidas aparte y más finas, en turiferario_hero.js; el vestido de
                        catedral, en turiferario_dress.js), Deo Ignoto (deo.js, deo_skeleton.js) y el Web Worker que
                        los genera (el Descoyuntado: descoyuntado.js, el cuerpo; desc_moves.js, golpes, esquivas y
                        guardia; desc_mind.js, el acecho, la furia y lo que aprende de ti; el Empalado:
                        impaled_model.js, los modelos del Empalado y de la Bestia, impaled.js, su pelea, y beast.js,
                        cómo se mueve la Bestia; henrique.js, el aliado de la Casa del Alemán; morador.js, Miguel, el
                        tonelero infectado (sus posturas: llorar, encogerse, morderse el brazo, ahorcado); leonor.js,
                        Leonor, la Dolorosa; guardian.js, los Velados; paio.js, Dom Paio, vivo y convertido; rey.js,
                        el Rey (sentado: su cara con mandíbula, párpados y cejas, la respiración, el temblor, las
                        toses con la mano a la boca, el brazo que va a las casillas y sus dos muertes);
                        custodio.js, el Custodio de la Garra; catacumbas.js, el Cavador, la Emparedada y el Enrodado;
                        coronado.js, el Coronado; fisico.js, el Físico de los Inocentes (su figura, sus hierros,
                        sus golpes por tiempos);
                        cuervo.js, el cuervo cebado, que se lleva solo en el aire (posarse, rondar, el picado);
                        turibulario_model.js, el arzobispo transfigurado de la cisterna; idol.js, la estatua de la
                        sima de la cisterna: dónde está y cómo se carga; idol_statue_geo.js, su geometría,
                        esculpida como los colosos, que se calcula en un hilo de fondo (idol_worker.js), e
                        idol_statue.js, su montaje y lo que se mueve: la cabeza, el ojo y lo que arde); sculpt.js (no el de colossus/), geometrías
                        esculpidas para los rigs (superficies, troncos, telas con sus pliegues, faldones, cabezas con
                        rasgos y manos con dedos); figure.js, el cuerpo humano y la ropa hechos con ellas (los usan
                        los ecos y el arzobispo); armas: weapons.js (registro y clips comunes), weapon_moves.js
                        (golpes del facón, el hacha, la lanza y la katana), weapon_models.js (modelos) y
                        weapon_common.js (agarre)
  game/                 juego, combate, interacción, cámara, atmósfera, fauna, navegación A* (nav.js: la rejilla plana
                        y la de capas, con escaleras y pisos), interfaz, iconos, guardado, textos y cinemáticas
                        (speech.js: los bocadillos de diálogo; house.js: el guion de la Casa del Alemán (la bajada de Henrique, sus
                        oleadas, las ventanas y la espada del hogar); souto.js: el pasadizo del Soto (el tablón y el equilibrio) y Miguel (lo que
                        dice, cuándo se ahorca); crypt.js: la Puerta del Dios Ignoto, las pilas, el incensario, las
                        rejas y el arca del relicario; relics.js: los objetos benditos; ossuaries.js: los puzles de
                        los cuatro osarios y su vista de cerca; paio.js: el guion de Dom Paio; rey.js: el guion del
                        Rey y su mesa (el encuentro, las partidas, los dos finales); cerco/: el Cerco (rules.js, las
                        reglas, sin three.js; ai.js, cómo piensa el Rey; ai_worker.js y thinker.js, su hilo de
                        fondo; levels.js, su fuerza en cada partida; board.js, las piezas, el cursor y las marcas
                        en el mundo); intro/: las
                        introducciones (intro.js, el director: la corta, al empezar partida, y la crónica, larga;
                        ghosts.js, los ecos: figuras de luz con sus poses, su material y su ceniza; ghost_models.js,
                        sus figuras, cada una con su cara y su ropa); spring.js: la fuente sin nombre de la cisterna
                        (el agua negra y su latido, las pavesas, el agua roja de la sima, el rojo que late detrás
                        de la cabeza de la estatua y sus luces, y la estatua, que vuelve la cabeza, abre el ojo y
                        susurra); cutscene.js: la de la bodega; hunt.js: la caza en las
                        bodegas; breakables.js: pilares, estanterías, almenas, torno y barricadas que se rompen;
                        fisico.js: el Físico por el barrio (la vigilancia, la cuarentena, la caza, la camilla);
                        fisico_cine.js: sus escenas (la cortina, la camilla y el forcejeo, su muerte);
                        fisico_pelea.js: la pelea de su quirófano; trampas.js: sus cepos y sus campanillas;
                        cornisas.js: el equilibrio en vigas y cornisas;
                        beast_chase.js: la transformación, la huida y el salto de fe; qte.js: las pulsaciones rápidas;
                        culling.js: lo que no se ve no se dibuja (el subsuelo desde la calle, y las criaturas y
                        los objetos que tapa un muro);
                        finale/: el jefe final, la película: director.js, los puntos de control y el estado del mundo;
                        film.js, el armazón (corrutinas, planos, franjas, pulsaciones, el jugador como marioneta);
                        film_acts.js y film_rise.js, film_nave.js, film_grab.js, film_city.js, film_tower.js,
                        film_ride.js y film_end.js, los seis actos, y film_heart.js, el final (el corazón del dios);
                        film_gun.js, manejar una espringala; film_wave.js, las casas que revientan en ola;
                        film_player.js, las poses del jugador; giant.js y giant_anim.js, el gigante para el guion y
                        sus animaciones; springald.js, las espringalas, su cadena y el virote; bell.js, la campana y
                        su cadena; colbody.js, su cuerpo en cápsulas (choques y cámara); wrecks.js, la ciudad que se
                        rompe; collapse.js, lo que se viene abajo de verdad (se ladea y se hunde); debris.js y
                        chunks.js, los cascotes y los trozos; dust.js, las nubes de polvo. De la pelea vieja quedan
                        turiferario_anim.js (animaciones que se siguen usando) y, sin enganchar, la de Deo Ignoto:
                        deo_boss.js, deo_anim.js, climb.js y surface.js)
  ui/                   motor de sprites pixel art de la interfaz y su hoja de estilos
  fonts/                fuentes pixeladas (OFL) y su licencia
tools/                  pruebas automatizadas con Playwright (requieren `npx vite --port 5199`):
                        progress.mjs   recorre toda la progresión hasta el final (la cripta honda y su
                                       puerta, el arzobispo, la película del jefe final entera y el río)
                        finale.mjs     un robot ve la película del jefe final desde cada punto de control,
                                       con las pulsaciones acertadas o falladas: pasa por los puntos de
                                       control en orden, nadie muere y acaba en el río
                        film.mjs       fotogramas de la película en los segundos que se pidan, en una hoja
                        intro.mjs      fotogramas de la introducción (o de la crónica: CUT=cronica) desde un
                                       plano, en los segundos que se pidan, con sus rótulos; END=1 sigue hasta
                                       el final y comprueba que la partida empieza bien
                        filmclip.mjs   busca los momentos de la película con la cámara metida en algo (una
                                       rejilla de rayos desde la cámara) y dice qué plano del guion es
                        filmaudio.mjs  mide lo que le cuesta al hilo de audio la película (grabación y
                                       reproducción limpia en un OfflineAudioContext)
                        colposes.mjs   hojas de poses de las animaciones de los colosos
                        fuzz.mjs       prueba de estrés con entradas aleatorias
                        holes.mjs      busca zonas transitables sin suelo visible (con «alto», lo que está
                                       en alto y bajo el castillo, recorrido como andaría el jugador)
                        zfight.mjs     busca caras en el mismo plano que se solapan (el suelo o el muro que
                                       parpadea entre dos texturas); con una región, sólo ahí
                        voids.mjs      rendijas a la nada en la cripta: fondo magenta y la cámara en cada sala
                                       de la cripta honda, en ocho rumbos, al frente y hacia arriba; guarda
                                       las vistas con fondo a la vista (un muro que no llega a su bóveda, un
                                       luneto con el hueco mal cortado, una cuña sin suelo)
                        floorgaps.mjs  tiras sin suelo dibujado (cada 5 cm) en los bordes y los vanos de las
                                       salas de la cripta honda, donde la colisión sí sostiene al jugador
                        rey.mjs        el Rey y su mesa: fotos, sentarse a jugar (reglas, su turno y el
                                       tuyo), los dos finales, tres partidas seguidas y retratos de sus
                                       gestos (`node tools/rey.mjs fotos|mesa|final a|final b|tres|retratos`)
                        cerco.mjs      el Cerco en la consola (sin navegador): las reglas, la velocidad de
                                       la IA y una liga del Rey contra jugadores de prueba
                        castlewalk.mjs recorre a pie el castillo: de la celda a la calle por las mazmorras, las
                                       catacumbas, el aljibe y la torre-puerta; con «torre», del adarve a la
                                       terraza y el puente levadizo
                        cryptwalk.mjs  recorre a pie la cripta honda desde el templo romano: a qué salas de su
                                       planta se llega (con «abierto», con todas las puertas abiertas) y dónde
                                       no se ve suelo bajo lo que se pisa
                        camclip.mjs    la cámara en el castillo, las mazmorras, la catedral y la cripta, contra
                                       muros, rejas y en escaleras, en muchas orientaciones: que no quede tras
                                       un muro ni pegada
                        freecam.mjs    capturas con cámara libre
                        uishots.mjs    capturas de todas las pantallas de la interfaz
                        posesheet.mjs  hoja de poses de las animaciones (ARMA=..., GHOST=s dibuja el arco)
                        weapontest.mjs cada arma en el juego: combo, pesado cargado, carrera, voltereta,
                                       bloqueo y curación contra un enemigo real
                        animcheck.mjs  (sin navegador) análisis numérico de los golpes: velocidad de la punta,
                                       filo por delante, agarre a dos manos, tirones y saltos al encadenar
                        gearcheck.mjs  escudo y hoja frente al cuerpo al andar, correr, girar y bloquear:
                                       cuánto se meten en el torso o las piernas y hacia dónde apunta la hoja
                        audiotest.mjs  renderiza sin altavoces cada tema, efecto y ambiente y mide niveles
                        audiobench.mjs coste de CPU del audio
                        audiostress.mjs carga del audio en situaciones de juego con la cámara en movimiento
                                       (horda, umbral de puerta, recorrido por zonas, jefe, estruendo): CPU del
                                       hilo de audio, tirones del hilo principal, picos, recorte, limitador,
                                       nodos, convolvers y presupuesto de voces
                        huntsim.mjs    simula la caza del Descoyuntado sin dibujar (segundos y un jugador
                                       robot: still, wander, fight, parry, levers o escape) y resume sus
                                       modos, cuándo enloquece, qué aprende, lo que te lee y lo que rompe
                        idlesim.mjs    rachas en que el Descoyuntado se queda a la vista sin hacer nada
                                       (jugador: wander, stopgo, still o look)
                        parrytest.mjs  parry contra cada criatura con un arma: desvío sin daño,
                                       desequilibrio, golpe de gracia, jefes y golpes imparables
                        beastchase.mjs el Empalado se transforma y un jugador robot hace la huida entera
                                       pulsando los avisos (con «fallos», falla algunos y muere en el fanal
                                       para probar el reintento): llega a la atalaya y queda vencido
                        doorways.mjs   nada tapa los arcos y puertas de las bodegas, las bocas de las
                                       grutas ni las palancas
                        clipcheck.mjs  interpenetraciones de cada animación de una criatura (campanero,
                                       plañidera): el arma en el cuerpo, los brazos en la campana, el suelo
                        bossanim.mjs   hojas de fotogramas de cada movimiento del Descoyuntado
                        cellar.mjs     comprueba que el pozo sólo se alcanza por el rastrillo y hace capturas
                                       de cada sala de las bodegas
                        boss.mjs       capturas del Descoyuntado en posiciones y cámaras dadas
                        cine.mjs       fotogramas de la cinemática de la bodega en los segundos pedidos
                        souto.mjs      la casa tapiada, el pasadizo y la casa del tonelero: la puerta, las
                                       escaleras, el tablón, cruzar sin corregir y corrigiendo, Miguel (lo
                                       que dice de lejos y de cerca, que no hace daño), sus puertas y que se
                                       ahorca si te vas (SHOTS=1: capturas)
                        morador.mjs    hoja de posturas de Miguel, desde delante y desde atrás
                        bocetos/       las láminas de arte, dibujadas por código como grabados iluminados (un
                                       estudio de valores que se graba a buril con líneas que siguen la forma,
                                       contornos a pluma y aguadas de color): lib.js, el motor; arzobispo.js y
                                       romanos.js, las dos láminas; mono3d.js, el monolito del juego visto con
                                       la cámara de una lámina (su silueta, su tono y lo que arde, para el
                                       grabado); `node tools/bocetos/render.mjs arzobispo [salida.png]` (o
                                       `romanos`) dibuja una (tarda un minuto)
arte/                   el arte (aquí no se borra nada: cada versión se guarda al lado; ver su README)
  bocetos/              las láminas: «I · El arzobispo, consumido» (de rodillas y de espaldas ante el
                        monolito lleno de almas, con el ojo abierto, en la cisterna roja, la noche de la
                        campana) y «II · Los que la encontraron primero» (los romanos, que rompen la roca y
                        dan con el monolito, todavía con la garra de oro en alto): son de cuando el ídolo
                        fue el monolito; el juego ha vuelto a la estatua
  bocetos/estatua/      las mismas láminas con la estatua (la II, también en su primera versión, sin la
                        mano), la forma que se quedó (en el juego, rediseñada: más grande, de piedra negra y
                        con el ojo que se abre)
archive/monolito/       el monolito lleno de almas, el ídolo que hubo antes de volver a la estatua: su
                        geometría, su montaje y su hilo de fondo, guardados con su explicación (ver su README)
archive/estatua_primera/
                        el montaje de la primera estatua, la que parecía una máquina (ver su README)
archive/colosos_propuestas/
                        las propuestas de jefe final que no se eligieron y el boceto del Plan A, guardadas
                        con su explicación (ver su README)
PLAN_JEFE_FINAL.md      el diseño del jefe final y su plan de trabajo
PLAN_LORE.md            el rediseño del lore (1167, los almohades, el plan B) y de la introducción
```

El progreso se guarda automáticamente en el navegador (`localStorage`) al descansar, abrir pasos y recoger objetos.
