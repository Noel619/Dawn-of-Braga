# Dawn of Braga · *Amanecer en Braga*

Survival horror medieval en 3D con combate **Soulslike**, ambientado en una Braga ficticia durante la Reconquista.
La ciudad ha caído tras un asedio: los sitiadores respondieron a la llamada de algo que dormía bajo la catedral, y la
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
| Mapa | M | View |
| Pausa y opciones | Esc | Start |

## Qué hay dentro

**Mundo.** El castillo (ver más abajo), la Calle del Soto, la Plaza
del Pan con su fuente, horca (con escalera por la que se sube al cadalso) y picota, la Calle de la Catedral, la Plaza
de la Catedral con la pira, la catedral (nave central con bóveda de cañón sobre arcos fajones y columnas adosadas,
coronas de velas colgadas, naves laterales con techo de vigas, arquerías, vidrieras, bancos con fieles muertos, y
un tejado con su grueso), el claustro (galerías con un tejado de faldones que se unen en limas, sus pares y faroles), la
Calle de los Pellejeros y las curtidurías, la Calle de la Muralla con su adarve y la Torre del Postigo, la Calle de la
Herrería con la fragua (rótulo del yunque, fuego visible desde la calle y taller decorado por dentro), y bajo la
catedral, todo abovedado: la escalera de la cripta, que baja por debajo de la nave bajo una bóveda en rampa; la sala
de llegada, de tres naves sobre columnas y arcos; el osario, un pasillo de calaveras con bóveda de huesos, fajones y
nichos con sus huesos; un templo romano de *Bracara Augusta* con mosaicos, columnas, arquitrabe caído y techo de
casetones; el sepulcro del arzobispo, y la cisterna del Dios Desconocido, un corro de columnas con sus arcos bajo una
cúpula con nervios de la que cuelga una corona de velas. La galería del río sube bajo su bóveda hasta las orillas
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
la Casa del Alemán, la de Henrique, nieto de un espadero de Solingen que vino con los cruzados de Colonia. Tres
demonios aporrean su puerta; Henrique, asomado a la ventana alta, reza y grita. Si acabas con ellos, te abre, y
dentro (un zaguán, la sala con su chimenea y la mesa, la cocina, la despensa y, arriba, la alcoba) te avisa en un
bocadillo sobre la cabeza de que vienen más: entran en tres oleadas reventando las contraventanas y saltando por
las ventanas, y hay que defenderle (su barra de vida aparece arriba, en el centro; si cae él, se pierde la defensa y
vuelve a empezar). Vencidas todas, te cuenta su historia y la de su mujer, Leonor, y te da martillo y clavos:
con los tablones que hay por la casa y el patio se tapian las ventanas una a una para que su casa sea un lugar
seguro. Hecho eso, te da la **espada de su abuelo**, una espada del Sacro Imperio forjada en Solingen (hace un 35 %
más de daño que la espada del carcelero), y la llave del sótano: Leonor hizo un pacto con lo que él llama el
diablo. Bajo la despensa, el sótano y un túnel bajan a su gruta, donde está **Leonor, la Dolorosa**: una mujer
convertida en una bestia enorme, hinchada de pus, que llora y acuna un hatillo. Escupe pus que quema en el suelo,
barre con los brazos, se arrastra para abrazarte, aúlla y, a media vida, revienta. Al vencerla deja su última
lágrima (una ampolla más), y Henrique, si vuelves, la llora.

**La cripta honda y la Puerta del Dios Ignoto.** Bajo la cripta de siempre hay tres épocas, cada una más honda
(el diseño, en `PLAN_CRIPTA_HONDA.md`). Por la puerta del templo romano se baja a la **Sala de los Obispos**, un
bosque de columnas con bóvedas de arista y los sepulcros de los obispos de Braga; por tres arcos se pasa a la
**cripta de San Martín de Dumio**, una iglesia de tres naves con arquerías de herradura: al fondo, la **Capilla de
San Martín** (altar de descanso), donde reza **Dom Paio**, el canónigo que bajó tras el arzobispo (al verte se
levanta de un salto; te cuenta lo que pasó y, cada vez que vuelves, lo que le falta a la puerta); a un lado, un
**osario** de muros de calaveras; y en el eje, el **Pórtico de los Velados**, que da a la tribuna de la antesala.
Bajo la sala de los obispos, las **Catacumbas de la Sé** (galerías con nichos en tres alturas, cubículos con su
arcosolio, un cruce de huesos y el **lucernario**, con el **Oratorio de San Pedro de Rates**, otro altar); más
abajo, la catacumba de los **Inocentes**, con su pila y el **Relicario de San Martín**, donde los muertos de la
cámara se juntan en el **Custodio de la Garra**: un coloso de calaveras y fémures que sale de un montón de huesos,
barre con los brazos, golpea el suelo con los dos (onda), lanza calaveras y agarra; se deshace en su montón para
rehacerse en otro sitio de la sala y, a media vida, pierde un brazo y se acelera. Al caer se abre el arca y la
Garra queda a la vista. Por el sepulcro del arzobispo se baja a la **cripta de los Mártires**, con su pila abajo y
la **Sacristía del arzobispo**, que se abre con su anillo. Dos atajos se abren desde abajo: la escalera de las
catacumbas a la sala de llegada y la de los Inocentes a San Martín. La **Confesión**, al fondo del osario de
arriba, mira por una reja a la cisterna, donde reza el arzobispo.

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
falta. Abierta, al otro lado espera la cisterna.

**El castillo, preparado para el asedio.** Una guarnición, no un palacio: cada parte sirve para resistir. Se entra
desde la Calle del Soto por una **torre-puerta en recodo** (rastrillo, buhederas en la bóveda, saeteras a los lados y
un giro a la izquierda antes del patio, para que nadie cargue en línea recta). El **patio de armas** tiene su pozo,
que baja al aljibe; el **cuartel de la tropa** (jergones en el suelo, la mesa larga, las lanzas de todos); la fragua
del armero con su muela; la cocina con el horno de pan y la caldera; las caballerizas, sin caballos (se los
comieron); la capilla de la guarnición, que acabó de hospital (el altar del castillo); el **fundíbulo** de la
defensa, partido por un tiro de los de fuera, con sus bolaños labrados a pico; caballos de frisa y la barricada de
la puerta. La escalera del adarve, pegada a la torre del homenaje, la partió un tiro: el tramo de arriba se desmoronó
en talud y quedan los peldaños volados y el escombro al pie; desde el patio no se sube a la muralla.

La **torre del homenaje**, el último reducto, ocupa la esquina noroeste y los adarves entran en ella. Se sube por una
escalera exenta, metida en un antecuerpo de sillería que llega a la muralla y a la torre de la cárcel (sin callejones
a los lados), hasta un rellano frente a la puerta, en la planta primera; un **puente levadizo** sobre un foso con
estacas la une con él, alzado desde dentro. Cada planta está partida por el muro de carga y tabiques con puertas de
arco. Planta baja: el **granero**, la **bodega**, el **almacén** y el **pozo** de la torre, a los que sólo se baja por
una trampilla. Primera: el **cuerpo de guardia** con el **torno del puente** y el pañol de la trampilla, y tras un muro
la **armería** (picas, escudos) y el **taller del ballestero**. Segunda: la **sala del alcaide**, partida por un arco
diafragma, con la mesa del plano de la defensa, la mesa del consejo y el libro de la guarnición; el **escritorio**,
con el alcaide muerto sobre sus cuentas junto a la chimenea y la manivela del torno que abre la reja de la cripta de
la Sé, y tras él su **alcoba**. Arriba, la **terraza** de combate: amplia, con su matacán sobre la puerta, la caseta
de la escalera con su tejado a dos aguas, la chimenea, el fanal, la caldera de la pez y piedras para tirar (ahí se
peleará con la Bestia de Carne; el escenario está listo, la pelea todavía no). Pisos sobre una viga maestra y
pilares de sillería.

**Las mazmorras.** Bajo el patio, todo abovedado en medio punto, con arcos fajones sobre pilastras y portadas de
arco en cada paso: el pasillo de las celdas (donde despiertas; cada celda con su arco y su reja, que también para
la cámara), el cuarto del carcelero (con la espada y el escudo) y la sala del tormento (el potro con su condenado
atado de muñecas y tobillos, la garrucha, la jaula colgada, el brasero de los hierros). Cavadas junto a una
necrópolis más antigua, las **catacumbas**: galerías de lóculos, unos tapiados y otros abiertos con el muerto
tendido dentro, un arcosolio con el sarcófago destapado y su tapa partida, y al fondo el **osario**, una capilla de
huesos con su altar de calaveras. Llegan hasta el **aljibe** del castillo: arquerías sobre columnas, agua negra y la
luz pálida que baja por el pozo del patio. Un pasadizo, con dos celdas de castigo, lleva a un rellano bajo la
muralla y a la escalera de la **torre de la cárcel**, que sube de frente a la puerta de la torre (y se baja igual).
En la torre, la escalera de mano sube a la sala de los guardas, con sus jergones y el libro de presos.

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
puertas atrancadas que solo se abren desde dentro (atajos), una reja que necesita la manivela del rastrillo, la
sacristía que abre el anillo del arzobispo, las ventanas que se tapian con martillo y tablones, la Puerta del Dios
Ignoto con sus cuatro cerrojos, altares de descanso que curan, rellenan las ampollas y devuelven a las
criaturas a sus puestos. Las puertas atrancadas muestran la tranca por el lado desde el que se quita. Mejoras
opcionales: ampollas vacías, relicarios de hueso (vitalidad), una piedra de afilar bendita (daño) y el rosario del
canónigo (aguante), que deja el Descoyuntado al morir. Treinta y un documentos breves cuentan la historia junto con el
escenario.

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
al moverse. El fijado elige al enemigo que tienes delante (con línea de visión) y la cámara lo encuadra con un
barrido suave, sin saltos. Bajo techos bajos y vigas la cámara se agacha en vez de atravesarlos; contra los muros
mide con un haz de rayos y guarda holgura a su alrededor (no se ve a través de paredes ni rejas), y de espaldas a
una pared, en vez de meterse en ella, sube sobre la cabeza y deja de dibujar el cuerpo.

**Animación procedural.** Clips con interpolación de Hermite y mezcla por cuaterniones, marcha bípeda con zancada
ajustada a la velocidad, balanceo de cadera, inclinación en las curvas y cinemática inversa de dos huesos en piernas
(los pies se apoyan en el suelo y en los escalones) y brazos; los escudos se estabilizan para mirar siempre al frente.
El brazo del escudo lo lleva con soltura (muelles de guiñada, cabeceo y alabeo, y mezcla de las poses de guardia,
marcha y carrera) y, si aun así fuera a meterse en el torso, la hombrera, la cadera o la pierna, se aparta; al trotar
y correr la hoja va por delante.

**Armas.** Cinco armas, cada una con su modelo, su estela, sus sonidos y su repertorio completo (combo ligero,
pesado, ataque a la carrera, ataque al salir de la voltereta, guardia, bloqueo y curación). Por el orden en que se
encontrarán:
- **Facón criollo** (una mano, con escudo): agazapado, cuatro cortes cortos que se encadenan (tajo, revés con el
  contrafilo, tajo corrido y puñalada), molinete de dos tajos y puñalada a fondo; hiere más por la espalda.
- **Hacha barbada** (dos manos, el escudo a la espalda; se para con el mango): golpes lentos y demoledores que
  desequilibran a casi cualquiera, barrido con las manos deslizándose por el mango y un hachazo del verdugo que se
  carga manteniendo el botón, rompe la guardia y parte el suelo con una onda.
- **Lanza de la muralla** (una mano, con escudo): estocadas largas y rectas, un barrido con el asta y una estocada
  que se lanza sin bajar el escudo.
- **Espada del carcelero**: la de siempre, sin cambios.
- **Katana sagrada** (dos manos): kesa-giri, kiriage, corte horizontal y tsuki; *iaijutsu* (desenvaina de la saya
  al cinto y corta en un gesto, con destello sagrado; también se carga) y un *makko* vertical.

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
  el arzobispo**; vencido, el **rito**: la carne del dios le envuelve y en su lugar se alza **el Turiferario**, un
  gigante de carne de 21 metros con la campana mayor encadenada a la mano, que revienta la cúpula, sale por el
  cráter, atraviesa la muralla y revienta la nave de la catedral detrás de ti. Seis actos: **la transformación** y
  la nave que se viene abajo; **el agarrón** (te atrapa, te ruge a la cara y te lanza por encima de la ciudad a la
  paja de un establo); **la Herrería**, la huida, con las casas reventando en ola a tu paso y la campana
  descargada donde estabas; **la primera espringala**, en la torre sur (cargar el torno, apuntar con el virote
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

- **Instancias:** ir directamente a un momento de una pelea, con las banderas como estarían en una partida: el
  arzobispo en la cisterna, cada acto de la película del jefe final (el rito, del cráter a la nave, el agarrón,
  la Herrería, la primera espringala, la cabalgada, la segunda espringala y el final), el río al amanecer; el
  Empalado, la huida de la Bestia y la caza del Descoyuntado; la defensa de la Casa del Alemán y Leonor; y en la
  cripta honda, el Custodio de la Garra, los Velados, Dom Paio en el pozo y la Puerta del Dios Ignoto con todo
  listo para abrirla.
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
también: `__game.dev.set('god', true)`, `__game.dev.act('rage')`, `__game.dev.tp('lagar')`.

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
                        level_castle.js: el castillo, la torre del homenaje y las mazmorras; level_keep.js: la
                        atalaya y la coracha; level_postigo.js: el Callejón del Postigo, la Casa del Alemán, su
                        sótano y la gruta de Leonor; level_crypt2.js: la cripta honda, una planta de salas
                        (la de los obispos, San Martín, las catacumbas, los Inocentes y el relicario, los
                        Mártires, la antesala y el pozo) de la que salen muros, suelos, navegación y mapa)
  dev/                  el modo desarrollador (devmode.js), quién puede abrirlo (access.js), las instancias de
                        las peleas y los controles del jefe (instances.js), el editor (editor.js) y el
                        laboratorio de los colosos (colossus_lab.js)
  entities/             rig articulado + animador, locomoción con IK, jugador, criaturas e IA; colossus/: el
                        escultor de los colosos (sculpt.js), su modelo con piel (model.js), el Turiferario
                        (turiferario.js; sus manos y su cara, esculpidas aparte y más finas, en
                        turiferario_hero.js; el vestido de catedral, en turiferario_dress.js), Deo Ignoto
                        (deo.js, deo_skeleton.js) y el Web Worker que los genera
                        (el Descoyuntado: descoyuntado.js, el cuerpo; desc_moves.js, golpes, esquivas y
                        guardia; desc_mind.js, el acecho, la furia y lo que aprende de ti; el Empalado:
                        impaled_model.js, los modelos del Empalado y de la Bestia, impaled.js, su pelea, y
                        beast.js, cómo se mueve la Bestia; henrique.js, el aliado de la Casa del Alemán;
                        leonor.js, Leonor, la Dolorosa; guardian.js, los Velados; paio.js, Dom Paio, vivo
                        y convertido; custodio.js, el Custodio de la Garra); armas:
                        weapons.js (registro y clips comunes), weapon_moves.js (golpes del facón, el
                        hacha, la lanza y la katana), weapon_models.js (modelos) y weapon_common.js (agarre)
  game/                 juego, combate, interacción, cámara, atmósfera, fauna, navegación A*, interfaz,
                        iconos, guardado, textos y cinemáticas (speech.js: los bocadillos de diálogo; house.js:
                        el guion de la Casa del Alemán, sus oleadas y las ventanas; crypt.js: la Puerta del Dios
                        Ignoto, las pilas, el incensario, las rejas y el arca del relicario; paio.js: el guion
                        de Dom Paio; cutscene.js: la de la bodega; hunt.js: la caza
                        en las bodegas; breakables.js: pilares, estanterías, almenas, torno y barricadas que se
                        rompen; beast_chase.js: la transformación, la huida y el salto de fe; qte.js: las
                        pulsaciones rápidas; finale/: el jefe final, la película: director.js, los puntos
                        de control y el estado del mundo; film.js, el armazón (corrutinas, planos, franjas,
                        pulsaciones, el jugador como marioneta); film_acts.js y film_rise.js, film_nave.js,
                        film_grab.js, film_city.js, film_tower.js, film_ride.js y film_end.js, los seis
                        actos, y film_heart.js, el final (el corazón del dios); film_gun.js, manejar una
                        espringala; film_wave.js, las casas que revientan
                        en ola; film_player.js, las poses del jugador; giant.js y giant_anim.js, el gigante
                        para el guion y sus animaciones; springald.js, las espringalas, su cadena y el
                        virote; bell.js, la campana y su cadena; colbody.js, su cuerpo en cápsulas (choques
                        y cámara); wrecks.js, la ciudad que se rompe; collapse.js, lo que se viene abajo
                        de verdad (se ladea y se hunde); debris.js y chunks.js, los cascotes y los trozos;
                        dust.js, las nubes de polvo.
                        De la pelea vieja quedan turiferario_anim.js (animaciones que se siguen usando) y,
                        sin enganchar, la de Deo Ignoto: deo_boss.js, deo_anim.js, climb.js y surface.js)
  ui/                   motor de sprites pixel art de la interfaz y su hoja de estilos
  fonts/                fuentes pixeladas (OFL) y su licencia
tools/                  pruebas automatizadas con Playwright (requieren `npx vite --port 5199`):
                        progress.mjs   recorre toda la progresión hasta el final (la cripta honda y su
                                       puerta, el arzobispo, la película del jefe final entera y el río)
                        finale.mjs     un robot ve la película del jefe final desde cada punto de control,
                                       con las pulsaciones acertadas o falladas: pasa por los puntos de
                                       control en orden, nadie muere y acaba en el río
                        film.mjs       fotogramas de la película en los segundos que se pidan, en una hoja
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
archive/colosos_propuestas/
                        las propuestas de jefe final que no se eligieron y el boceto del Plan A, guardadas
                        con su explicación (ver su README)
PLAN_JEFE_FINAL.md      el diseño del jefe final y su plan de trabajo
```

El progreso se guarda automáticamente en el navegador (`localStorage`) al descansar, abrir pasos y recoger objetos.
