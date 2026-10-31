# El castillo, otra vez: castillo, palacio del rey y sede de la corte

Plan de diseño y de trabajo, empezado el 30 de octubre de 2026 y rehecho el mismo día con las respuestas del autor
(§0). Lo que pidió primero:

- El castillo se queda **pequeño**. Tiene que ser **mucho más grande** (seguramente con **un área nueva
  entera**) y **mucho más épico, por fuera y por dentro**, porque es a la vez **castillo, palacio del rey y sede
  de la corte**.
- **No hay prisa.** Se hace por fases; la primera sólo adelantó trabajo (el Rey y su juego).
- **La torre del homenaje**, planta a planta: **arriba**, el Rey y su última partida (hecho); **en medio**, la
  planta de armas, amplia, con **la ballesta** al final de un recorrido que cueste; **abajo**, los víveres y la
  bajada **tapiada** a las catacumbas y las celdas (que se pueda abrir).

## 0. Lo que respondió el autor (y lo que sale de ello)

| Pregunta | Respuesta | Qué cambia |
|---|---|---|
| ¿El Rey o el alcaide? ¿Su nombre? | El Rey: **Alfonso I de Portugal**, deshecho por la guerra (en esta historia, en vez de tomar Lisboa, Portugal sufrió una contraofensiva de los almohades). **Él no se nombra**; los documentos y otros personajes, sí. **El Rey, tal como está, no se toca.** | Nada en `game/rey.js`, `entities/rey.js` ni sus frases. Su nombre sale sólo en papeles del castillo y del Paço («Dom Afonso», «Ego Alfonsus, Portugalensium rex»). |
| ¿El Paço en el camino o aparte? ¿Dónde? | **Grande**: alrededor del **25 % del mapa de la ciudad**, un poco más o un poco menos. Palacio del Rey, sus jardines, el castillo y todo lo que conlleva, **diseñado a partir de cómo eran de verdad**. Y **hay que recorrerlo sí o sí**: la compuerta del sótano de la iglesia (la reja de la cripta de la Sé) pedirá **cinco llaves o amuletos** que están ahí. **Fuera la manivela**: recoger una palanca es demasiado soso. | §2, §3 y §7: el Paço va al norte y al oeste del castillo (la ciudad crece hacia poniente); la reja de la cripta tiene cinco cerraduras y sus cinco llaves son de los cinco oficiales de la corte. |
| La ballesta | **A dos manos.** Los virotes, por ahora, **sólo en el castillo**. Queda por pensar cómo se integran del todo. | §9. |
| ¿Pelea en el Paço? | **La Corte de los Infieles**: todos los cortesanos que traicionaron al Rey van a por ti con cuchillos, como en el asesinato de Julio César. **Muy rítmica**, muchos enemigos, no un jefe solo. | §8. |
| La recompensa del Rey | **Sólo la pieza de marfil**, que necesita **un sprite nuevo** (el de ahora es feo). | El icono del rey de marfil, rehecho (hecho). Nada más. |
| (añadido después) | **Un jefe opcional, el más difícil del juego**: el Caballero de la Orden, el mejor del ejército portugués, ya infectado, en lo más alto del mapa, mirando la luna. Rápido, de críticos, de habilidades a distancia una tras otra, que desvía tus golpes; **una danza**. Con **defensa de armadura**: todas las armas le hacen menos daño según su calidad, salvo la espada del alemán y la sagrada. | §10. |

**La medida.** El mapa de la ciudad (lo que dibuja el mapa del juego, sin el río) va de x = −93 a 80 y de
z = −126 a 58: unos 173 × 184 m, **31.800 m²**. El 25 % son **unos 8.000 m²**. El Paço que sigue tiene unos
**6.500 m²** de recinto, más el foso del rey, la parte nueva de la torre y las plantas altas: **algo más del
25 %** si se cuenta lo que se anda.

## 1. Lo que hay ahora

| Pieza | Ahora |
|---|---|
| Patio de armas | 39 × 40 m, cerrado por una muralla de 9 m |
| Torre del homenaje | 20 × 20 m en planta y 13,6 m hasta la terraza: asoma sólo 4,6 m por encima de la muralla |
| Cada planta de la torre | unos 300 m² útiles, partidos en tres o cuatro estancias de 8 × 8 m |
| Sala del alcaide | 8 × 17 m, partida por un arco diafragma |
| Al oeste | el borde del mundo (la malla de la ciudad empieza en x = −96) |
| Al norte | el foso seco, una horca, manzanas de relleno y la coracha, que sube hasta la atalaya |

El recorrido: la celda (bajo la torre) → las mazmorras, las catacumbas y el aljibe → la torre de la cárcel → el
patio → la calle. Mucho después, tras la huida por la muralla y el salto de fe: la atalaya → la coracha → el
adarve del castillo → la poterna → la sala del alcaide (el Rey) → el escritorio (la manivela) → el torno del
puente levadizo → otra vez el patio (el atajo). Con la manivela se abre la reja de la cripta de la Sé.

Por qué se queda pequeño:

1. **No hay palacio ni corte.** Es un cuartel: ni sala del trono, ni capilla real, ni cámaras del rey, ni
   cancillería. Nada dice que ahí viva un rey.
2. **La torre no manda.** Desde la ciudad se pierde entre los tejados; desde el oeste es una caja.
3. **Las plantas son cuatro cuartos.** En 300 m² no cabe un recorrido (la ballesta pide uno), y la planta baja es
   un callejón sin salida al que sólo se baja por la trampilla.
4. **Por fuera, una muralla con almenas, la torre-puerta y nada más**; al oeste, el vacío.

## 2. La idea: la alcáçova de Braga

**Braga fue corte de reyes** (la de los suevos, a los que bautizó San Martín de Dumio) y es la sede del primado.
Cuando el sur empezó a caer, Dom Afonso subió con su corte a la ciudad vieja y se hizo un Paço junto al
castillo, como el que tenía en la alcáçova de Coimbra.

**Cómo eran de verdad** (las fuentes, al final). Un palacio real de los siglos XII y XIII no es un edificio sino
un recinto con tres esferas, cada una con su cara:

| Esfera | Qué es | Piezas (y de dónde salen) |
|---|---|---|
| **La guerra** (el castillo) | la guarnición y la defensa | el patio de armas, la torre del homenaje **metida en el muro que separa los dos recintos** (como en Tomar), la coracha (un muro que sale del recinto y protege un paso), la barbacana ante la puerta, las torres albarranas (adelantadas y unidas al muro por arriba) |
| **Lo público** (la corte) | donde se gobierna y se juzga | **la sala** (el aula, la sala del trono: la de Coimbra es hoy la Sala dos Capelos; como el Saló del Tinell de Barcelona, bajo arcos diafragma), con su estrado y el trono al fondo y el pasillo de servicio al otro extremo; **la cancillería** (el canciller guarda el sello y escribe las cartas del Rey; el de Dom Afonso fue **Mestre Alberto**); **el archivo y el tesoro en una torre** (en Lisboa, la **Torre do Tombo**, la del Haver, en la alcáçova); **la capilla** junto a la sala, a veces de dos alturas, con la tribuna del Rey |
| **Lo privado** (la casa del Rey) | donde vive | **la cámara** (antecámara, cámara de dormir, guardarropa; la cámara servía también de tesoro, por eso en sitio seguro), el oratorio; **los servicios** al extremo bajo de la sala (despensa, botillería, **la cocina aparte** por el fuego, con su chimenea alta como las de Sintra o la de Fontevraud), el horno, las caballerizas y la halconera; **el jardín** (cerrado, en cuatro cuadros con dos paseos que se cruzan en una fuente, setos de **arrayán**, **naranjos amargos**, una alberca: los de Sevilla y la Alhambra), el pomar, la huerta, el palomar y el vivero |

**La corte de Dom Afonso**, con los tres grandes oficios que la historia le da desde su reinado: el
**mayordomo mayor** (la casa y los bienes del Rey: el primero de la corte), el **alférez mayor** (la hueste, el
pendón; manda cuando el Rey no está) y el **canciller** (el sello y las cartas). Con ellos, el **capellán mayor**
y el **camarero** (la cámara del Rey y lo que guarda). Son los cinco de las cinco llaves (§7).

**Lo que pasó** (para escenarios y documentos). Desde el día diez del asedio el arzobispo bajaba de noche a la
cripta de la Sé y de abajo subían cosas que no eran cánticos. El cabildo se quejó al Rey, y el Rey mandó cerrar
la reja de la cripta **con cinco cerraduras, como el arca de los privilegios** (las arcas de tres llaves de
concejos y cabildos, que sólo se abrían con todos sus llaveros delante), y dio una llave a cada uno de sus cinco
oficiales: que no bajara nadie sin que lo supiera la corte entera. La noche de la caída, **los cinco le abrieron
la reja al arzobispo** (lo que les prometió, no lo dice nadie del todo), la volvieron a cerrar tras él y sus
canónigos y subieron al Paço a velar con la corte en la sala grande. Abajo, el arzobispo se arrodilló sobre la
fuente; arriba, la campana tocó sola y los que la oyeron se arrodillaron: la corte entera, y el Rey con ella.
Luego **la corte se levantó con los cuchillos** y fue a por el Rey, cada uno con lo suyo, para que la culpa fuera
de todos (por eso lleva esa venda negra bajo el pecho). El alcaide llegó con la guardia, se lo llevó a rastras
por el pasadizo a la torre del homenaje, **quemó el pasadizo detrás** y alzó el puente («que no suba nadie del
patio»). El alcaide murió sobre sus cuentas; el Rey se quedó solo en la torre, sentado a la mesa de su juego. Los
cortesanos siguen en la sala, de rodillas ante el trono vacío, con los cuchillos en la mano, esperando a que
vuelva. Las cinco llaves siguen con los cinco.

**Sus armas**: las del Rey, no las negras de la guarnición. Estandartes blancos con la cruz azul (las primeras
armas de Portugal) en el Paço y en lo alto de la torre; los negros, en las murallas.

## 3. El plano nuevo

**Dónde.** Al norte del castillo y a poniente de la coracha, hasta la muralla norte, y la ciudad crece hacia el
oeste (de x = −96 a −150: ahí no había nada). El recinto del Paço va de x = −146 a −62 y de z = −122 a −45
(84 × 77 m). Las manzanas de relleno al oeste de la coracha desaparecen; las del este se quedan. La huida, el
salto de fe y la coracha **no se tocan** (el Paço no pisa la línea de la atalaya).

```
 x: −146          −118           −90       −70   −62
z −122 ┌─────────────┬──────────────┬──────────┬────┐  muralla norte · Torre del Fanal
       │ POMAR Y     │ JARDÍN DEL   │ COCINAS  │CA- │       [atalaya]
       │ HUERTA      │ REY          │ y patio  │BA- │          ║
       │ palomar,    │ claustro,    │ de serv. │LLE-│          ║
       │ colmenas,   │ fuente, ala- │ horno,   │RI- │          ║ la coracha
       │ vivero      │ berca, mira- │ despensa,│ZAS │          ║
z −98  ├────────┬────┴──────────────┴──────────┴────┤          ║
       │CAPILLA │  SALA DE LA CORTE (40 × 18 m)      │          ║
       │ REAL   │  estrado al oeste · servicio al este│          ║
z −80  ├────────┼──────────────────┬────────────────┤          ║
       │ TORRE  │ CÁMARAS DEL REY  │ PATIO DE LA    │ ←── escalera de la coracha
       │ DE LA  │ (dos plantas)    │ CORTE          │   [torre de la coracha, z −64]
       │ REINA  │                  │                │          ║
       ├────────┤                  ├──────┬─────────┤          ║
       │CANCILL.│                  │ cuer-│ PUERTA  │          ║
       │+ TORRE │                  │ po de│ DEL     │          ║
       │DEL TOMBO│                 │guardia│ PAÇO   │          ║
z −45  └────────┴───────┬──────────┴──────┴────┬────┘          ║
                   pasadizo      FOSO DEL REY   puente           ║
       ┌────────────────┴─[TORRE DEL HOMENAJE]──┴──────────────╨──┐
       │   PATIO DE ARMAS                                         ├─[torre-puerta]
       └──────────────────────────────────────────────────────────┘
```

**Las piezas** (medidas de partida; se afinan al construir):

- **El foso del rey** (x −97 a −62; z −45 a −29 al norte de la torre, a −23 al este): seco y hondo (4 m), con
  estacas, la horca y lo que tiraron desde arriba. Un **puente de piedra** va de una puerta nueva en la muralla
  norte del castillo (al este de la torre) a la **Puerta del Paço**, dos torres con su paso y una barbacana.
  La puerta está **atrancada por dentro**: abrirla es el atajo al patio de armas.
- **El Patio de la Corte** (≈ 28 × 35 m): el patio de honor. Al norte, la portada de la sala con su
  **escalinata**; al oeste, la galería de las cámaras; al sur, el cuerpo de guardia de los archeros (la guardia
  del Rey: Sintra y Coimbra conservan su Sala dos Archeiros) junto a la puerta; al este, la coracha, por cuya
  cara de dentro **baja una escalera** desde su torre: **por ahí se entra la primera vez**. Un pozo con brocal y
  un olmo seco.
- **La Sala de la Corte** (≈ 40 × 18 m): el aula régia. Seis arcos diafragma y la armadura de madera encima; el
  estrado al oeste con el trono bajo su dosel y la mesa alta; las mesas largas de caballetes; el hogar en medio;
  los estandartes blancos y azules; al este, **el pasillo de servicio** con las puertas a la despensa, a la
  botillería y al paso de la cocina; detrás del estrado, **la puerta privada** a las cámaras del Rey. Ahí espera
  la Corte de los Infieles (§8).
- **Las Cámaras del Rey** (≈ 28 × 35 m, dos plantas en torno a un patinillo): abajo, el guardarropa, el tesoro
  de la cámara (la llave del camarero) y la escalera; arriba, la antecámara, la cámara de dormir, el oratorio con
  su ventana a la capilla y **la puerta del pasadizo**: una galería cubierta sobre arcos que cruza el foso hasta
  la planta del Rey en la torre del homenaje. **Quemada**: quedan los arcos, los pies derechos negros y una viga
  por la que se pasa **haciendo equilibrio** (como en los tejados de los Pellejeros).
- **La Capilla Real** (≈ 24 × 12 m, de este a oeste): nave, ábside con el altar, espadaña con su campana; a los
  pies, **la tribuna del Rey**, a la que se sube desde las cámaras. La llave del capellán (§7).
- **La Cancillería y la Torre del Tombo** (esquina suroeste): la sala de los escribanos (mesas de escribir, el
  sello, la cera, los registros) y, adelantada sobre la muralla de poniente como una **albarrana**, la torre del
  archivo y del tesoro, de cuatro sobrados de arcas. La llave del canciller, arriba (§7).
- **La Torre de la Reina** y su jardincillo: cerrada desde la Cuaresma (el Rey: «Mi reina se murió en la
  Cuaresma»). Sus cosas tapadas con paños. Opcional.
- **Las Cocinas** (≈ 28 × 24 m): la cocina grande, exenta, cuadrada, con **la chimenea cónica** que se ve desde
  toda la ciudad; la despensa, la botillería y el horno; el patio de servicio con el pozo y la leña. Se llega a
  la sala por el extremo bajo, como se llegaba de verdad.
- **Las Caballerizas y la halconera**, a lo largo de la coracha: los pesebres vacíos (los caballos del Rey
  también se los comieron), las sillas en sus potros y, en la halconera, los halcones encapirotados, muertos en
  sus alcándaras.
- **El Jardín del Rey** (≈ 28 × 24 m): un claustro con su galería en dos lados; cuatro cuadros con setos de
  arrayán y naranjos amargos (secos), los dos paseos que se cruzan en la fuente, la alberca larga y, en la
  muralla norte, el **mirador** (desde ahí se ve el campamento de los sitiadores).
- **El Pomar y la Huerta** (≈ 28 × 24 m): los frutales en filas (muertos), los bancales, el **palomar** redondo,
  las colmenas y el vivero de los peces.
- **Los muros**: la muralla norte sigue hasta la nueva esquina noroeste; la de poniente, nueva, con dos torres;
  al sur, el muro del Paço sobre el foso (al oeste de la torre, sobre el talud de fuera).

**El recorrido.** Tras el salto de fe, la coracha. En su torre (el altar), la escalera nueva baja al **Patio de
la Corte**: la sala al frente, la chimenea de las cocinas detrás, la torre del homenaje encima del foso. La Puerta
del Paço, a un paso: se desatranca y queda el atajo al castillo y a la ciudad. Las puertas grandes de la sala,
atrancadas por dentro; se entra **por el servicio**: el patio de las caballerizas, las cocinas, la despensa y el
pasillo de servicio. Desde ahí, todo el Paço en anillos: la sala y sus cámaras, la capilla por la tribuna o por
el jardín, el jardín y el pomar, la torre de la reina, la cancillería y el Tombo; y por el pasadizo quemado, a la
torre del homenaje. Con las cinco llaves, a la Sé.

## 4. La torre del homenaje, planta a planta

**El modelo**: las torres del homenaje románicas que se conservan enteras, Rochester y Castle Hedingham (siglo
XII): planta cuadrada, muros de tres metros, un **muro de carga** que la parte en dos en cada planta, un
**antecuerpo** que protege la entrada en la planta primera con su foso y su puente (el de ahora ya lo es), la
**sala a doble altura** con una galería alrededor y **un gran arco diafragma**, y torrecillas en las esquinas
por encima de la terraza.

**Las medidas**: 26 × 26 m (x −97 a −71, z −29 a −3), muros de 2,4 m. La cara sur sigue donde está (el
rellano, el puente y la torre de la cárcel no se mueven) y la norte asoma al foso del rey, a caballo de la
muralla norte del castillo. Plantas: la baja a 0, la primera a 4,5 (la puerta del puente), la segunda a 9 (la
del adarve y la coracha: la poterna sigue a su altura), la sala del Rey **a doble altura, hasta los 18**, con una
galería de madera a 13,5, y la terraza a 18,4, con torrecillas hasta los 22. **Todo sale de unas pocas
constantes** en `world/level_torre.js` (antes, cada estancia tenía sus coordenadas escritas a mano en
`level_castle.js`).

### 4.1 Arriba: el Rey y su juego (**hecho**; se muda con la sala, sin tocarlo)

Lo que hay (ver §6): el Rey en su sitial ante la mesa del Cerco, bajo el arco diafragma; el escritorio con el
alcaide muerto sobre sus cuentas; la alcoba, con la Plañidera. Con la torre nueva, la sala sube a doble altura,
con su galería; del escritorio sale la escalera a la galería y de la galería, la de la terraza y **la puerta del
pasadizo** a las cámaras del Rey. **La manivela desaparece** del escritorio: la reja de la cripta pide las cinco
llaves (§7). La última línea del alcaide cuenta la cerradura de cinco llaves.

### 4.2 En medio: la planta de armas y la ballesta

**Lo que es.** La planta de la guerra: el cuerpo de guardia (con el torno del puente), la armería, el taller del
ballestero, el pañol de los virotes, el dormitorio de los ballesteros y la galería de saeteras.

**Por qué cuesta.** Un bolaño de los sitiadores entró por el muro norte y se llevó el suelo del taller; los de
dentro tapiaron lo que quedaba para que no subiera lo que había abajo. La ballesta del maestro ballestero está al
fondo, sobre su banco, al otro lado del hundimiento.

**El recorrido**:

1. Del cuerpo de guardia al taller, el paso directo: **escombro** hasta el techo (no se pasa; se ve la luz del
   taller entre las piedras).
2. La armería, **atrancada con tablones**: picas, yelmos, la cota del alcaide y, en el suelo, el agujero del
   bolaño, que da al granero de abajo.
3. **Abajo** (planta baja), a oscuras: ratas, los que comen, y el montacargas del pañol, con su cuerda.
4. **Subir por la cuerda** del montacargas al pañol de virotes (una pulsación sostenida, como las palancas).
5. Del pañol, por una saetera ensanchada a mazazos, **al cadalso**: la galería de madera colgada por fuera de
   la torre. Tablas rotas y, en la esquina, en su garita, **el alférez mayor**, convertido, con la ballesta de la
   guardia: aprendes lo que hace una ballesta recibiéndola. Su llave (§7).
6. Por la ventana del taller, **dentro**: el suelo inclinado hacia el hueco, vigas colgando, el maestro
   ballestero muerto bajo una viga, con **la ballesta** en el banco y los virotes en su caja.
7. **El atajo**: el tabique tapiado entre el taller y el cuerpo de guardia se derriba desde dentro.

### 4.3 Abajo: los víveres y la bajada tapiada

Los víveres del asedio (el almacén, el granero, la bodega y el pozo de la torre) y **la escalera de caracol** que
bajaba a la cárcel. **La celda del jugador está debajo de la torre** (x −87,6, z −16,2):

- **Desde abajo**, al principio del juego, en el pasillo de las celdas: una **pared de ladrillo nuevo**, con la
  cal fresca, donde antes había una puerta. Arañado en ella: LO QUE SUBE NO ES NUESTRO.
- **Desde arriba**, en la bodega de la torre: la puerta de la escalera, **tapiada con sacos, piedras y cal**.
  Encima, colgado de su cuerda, el sillar del contrapeso del montacargas: **un tiro de ballesta a la cuerda** lo
  deja caer y revienta lo tapiado (o un mazo de cantero de la armería).
- **Abierta**, une la torre con las celdas y las catacumbas: un atajo de vuelta al principio. Y deja ver lo que
  subía: el rastro de algo grande que arañó la escalera desde abajo.

### 4.4 Lo alto: la terraza

Donde se peleará con la Bestia de Carne (el escenario está listo; la pelea, todavía no). Más ancha y más alta:
cuatro torrecillas, el matacán, la caldera de la pez, el fanal y **el estandarte del Rey**, blanco con la cruz
azul, y la vista del Paço.

## 5. El Cerco (el juego de mesa) — **hecho**

De la familia de los *tafl* (el *tablut* que anotó Linneo, el *hnefatafl* de los nórdicos): **un rey cercado en
el centro que tiene que escapar, y una hueste que tiene que atraparlo**. Tablero de 9 × 9 con el trono en medio y
las afueras alrededor; tú llevas al rey de marfil y sus ocho, él a los dieciséis de fuera; todo anda en línea
recta, se mata cogiendo en medio (el trono vacío también muerde), el rey gana en cualquier casilla de las
afueras y los de fuera, atrapándolo. Tablas por repetición o a las ciento sesenta jugadas.

Él piensa en un hilo de fondo (`game/cerco/ai.js`: alfa-beta con profundización iterativa, tabla de
transposición, ordenación de jugadas y una búsqueda de amenazas que ve las horquillas), juega peor según se apaga
(`game/cerco/levels.js`) y piensa entre dos y cinco segundos aunque la búsqueda tarde menos. Medido con
`node tools/cerco.mjs liga`. Los controles y la vista, en el README.

## 6. El Rey (el personaje) — **hecho, y no se toca**

- **El cuerpo** (`entities/rey.js`): esqueleto humanoide con mandíbula y párpados propios; cara chupada, pelo y
  barba blancos, la corona ladeada, el manto forrado de piel, la manta, las venas negras, el anillo del sello, el
  pañuelo y la venda negra bajo el pecho (las puñaladas de su corte).
- **Cómo está** (respiración, temblor, párpados, cabeza que se cae, tos, dolor), **lo que hace** (colocar,
  pensar, alargar el brazo con IK, intentar levantarse, reír, adormilarse, tender la pieza, sus dos muertes), **la
  voz**, **la música** (`cerco`, `reyFin`) y **las banderas** (`rey:met`, `rey:partidas`, `rey:ganada`,
  `rey:muerto`).
- **Lo que deja**: **el rey de marfil**, en los dos finales (si le ganas, más vitalidad). Su icono, **rehecho**:
  una pieza de ajedrez de verdad, torneada, con su corona de cinco puntas, la cruz y la luz del marfil.

## 7. Las cinco llaves y la reja de la Sé

**La reja** de la escalera de la cripta (`d_cripta`) ya no tiene torno: tiene **cinco cerraduras** en una
pletina de hierro, cada una con su marca, y al examinarla dice cuáles faltan. Con las cinco, se echan una a una y
la reja baja por su ranura. **La manivela desaparece** (el objeto, su sitio en el escritorio, su icono en las
llaves y las frases que la nombran).

| Llave | De quién | Dónde | Cómo |
|---|---|---|---|
| **La llave del alférez** | el alférez mayor | el cadalso de la torre del homenaje | convertido, con la ballesta de la guardia, en su garita (§4.2) |
| **La llave del mayordomo** | el mayordomo mayor | la Sala de la Corte | la lleva el último de la Corte de los Infieles (§8) |
| **La llave del camarero** | el camarero | el tesoro de la cámara, en las cámaras del Rey | muerto dentro del tesoro, que cerró por dentro; se entra por arriba |
| **La llave del capellán** | el capellán mayor | la Capilla Real | colgada del cordón de la campana: hay que subir a la espadaña desde la tribuna |
| **La llave del canciller** | el canciller (Mestre Alberto) | lo alto de la Torre del Tombo | en el arca que dice el registro, entre muchas |

Cada llave, con su icono y su pequeño texto (de quién era, de qué color es su cinta). Los documentos que lo
cuentan: la carta del Rey que manda la cerradura («Ego Alfonsus, Portugalensium rex...», con su romance), la
confesión del capellán, el registro del Tombo, lo último del camarero y una nota del mayordomo.

## 8. La Corte de los Infieles

**Qué es.** No un jefe: **la corte entera**, veintitrés cortesanos (las veintitrés puñaladas de César), de
rodillas en dos filas ante el trono vacío, cada uno con su cuchillo en las manos como quien lleva una ofrenda.
Entre ellos, al pie del estrado, el mayordomo.

**Cómo empieza.** Al pisar el estrado, las puertas del pasillo de servicio se cierran solas y empieza un tambor
(o sus palmas, a compás). Se levantan de uno en uno, en el orden en que estaban, y te rodean.

**Cómo pelean** (la parte rítmica). Un director lleva **el compás**: en cada golpe del tambor **ataca uno solo**,
el que el compás señala (alza el cuchillo un tiempo antes: se ve venir); los demás cierran el corro con los
cuchillos en alto. Los cortesanos **caen pronto** (dos golpes; un parry a compás los deja abiertos y el
golpe de gracia los mata), pero el corro no para: **tres oleadas** (siete, ocho y ocho), y cada una con el compás
más deprisa. Romper el corro con una voltereta o una carga lo deshace unos tiempos. El último, solo y en
silencio, **el mayordomo**: el que más quería el Rey. Cae y se acaba el tambor; se abren las puertas, la llave.

**Si mueres**, vuelven a sus sitios, de rodillas. **Vencidos**, la sala queda en silencio con sus cuerpos y
las puertas grandes se desatrancan desde dentro (el atajo al patio).

**El cortesano** (criatura nueva): ropa larga de corte (brial, manto, cofia o bonete), las manos y la cara
grises, los ojos cerrados como dormido; un cuchillo de mesa o de monte. Sueltos por el Paço hay unos pocos más:
rezan de rodillas por los pasillos y se levantan al verte.

## 9. La ballesta

**A dos manos**: el escudo va a la espalda (como con las armas grandes). Se elige en el inventario como
cualquier arma.

- **Disparar** (ataque ligero): apunta a lo que tienes fijado o, sin fijar, al frente con la retícula. El virote
  vuela recto y rápido, se clava en lo que toca; a las criaturas pequeñas las **desequilibra**.
- **Recargar**: se monta sola tras el tiro, con el pie en el estribo (casi dos segundos, quieto y a merced; si te
  golpean, se pierde y hay que volver a empezar).
- **Golpe con la culata** (ataque pesado): para lo que se acerca demasiado.
- **Los virotes se cuentan** (junto a las ampollas). **Sólo hay en el castillo y en el Paço**: la caja del
  taller, el pañol, los carcajes de los ballesteros muertos, los cadalsos. No se recogen los disparados (por
  ahora: queda por pensar, como dijo el autor).
- **Sirve para** cortar cuerdas: el contrapeso de la bajada tapiada (§4.3) y, más adelante, la jaula colgada del
  tormento y otros atajos.

## 10. El Caballero de la Orden (jefe opcional)

**Lo que pide el autor** (sus palabras, en el apéndice): el jefe más difícil del juego, **por lejos**, y opcional.
En lo más alto del mapa, **mirando la luna**, melancólico, con el viento. Un caballero, el mejor de los hombres
del ejército portugués, ya contaminado. Apoyado en su espada, se da la vuelta y te mira; se pone en guardia y la
cámara pasa a **un plano lateral**: el Prisionero a la izquierda, el Caballero a la derecha, el viento y las
hojas pasando entre los dos mientras la cámara se aleja despacio; luego, la pelea. **Ataques rápidos que son
críticos**, **acometidas en línea recta**, mucha frecuencia; **apenas deja huecos** y **desvía tus golpes** si no
le pillas desprevenido; **habilidades una tras otra**, nada de los golpes cortos de las criaturas de siempre.
Difícil, de **memorizar** y de ir **preparado**. Y una estadística nueva, **la defensa de armadura**.

**Dónde** (propuesta): **la terraza de la torre del homenaje rehecha**, lo más alto del mapa (la terraza a
18,4 m y las torrecillas a 22; la Torre del Fanal llega a 18). De noche siempre, con la luna grande sobre el
Paço, el estandarte del Rey restallando y el humo de la ciudad abajo. Se sube por la escalera de la galería de la
sala del Rey: **es opcional** porque nada del recorrido obliga a subir. (La terraza se guardaba para la Bestia de
Carne: ver §12.)

**Quién** (propuesta): un **caballero de una orden militar** (en 1167 están el Temple, que hizo Tomar en 1160, y
la milicia de Évora, recién nacida), el alférez de las hazañas del Rey. Sin nombre en el juego, como el Rey; los
documentos lo llaman «el Caballero de la Orden». Cota de malla y sobreveste blanca con la cruz, yelmo cerrado
de cimera, la espada larga y la capa, todo hecho jirones y con la infección asomando por las juntas.

**Cómo pelea** (propuesta, para afinar con el autor). Un repertorio de **habilidades** que encadena sin parar,
cada una con su aviso propio (un sonido y una pose que se aprenden):

| Habilidad | Qué hace |
|---|---|
| **La acometida** | cruza la terraza en línea recta, de un extremo a otro, con la espada por delante (de una a tres seguidas, cambiando de rumbo) |
| **El tajo del viento** | un tajo a distancia: la hoja levanta una cuchilla de aire que corre por el suelo |
| **La cruz** | dos tajos en cruz que dejan una estela que corta un instante después |
| **El salto** | salta alto, cae de punta donde estabas y barre al levantarse |
| **El desvío** | si le atacas de frente sin que esté abierto, para y contraataca (crítico) |
| **La carga del pendón** | arranca el estandarte del Rey de su asta y barre con él toda la terraza (sólo a media vida) |

**Sus golpes son críticos** (hacen el daño de un golpe de gracia) y **sus huecos, muy cortos**: tras la tercera
acometida, al clavar la espada en el salto y cuando un desvío tuyo le pilla (el parry sí le abre). **La defensa
de armadura**: cada arma tiene su calidad, y contra él (y sólo contra él, por ahora) hace menos daño cuanto peor
es: la espada oxidada (nueva, por añadir) un 50 % menos; el facón, el hacha, la lanza y la espada del carcelero,
entre un 25 y un 40 % menos; **la espada de Solingen y la katana sagrada, nada menos**.

## 11. Fases y orden de trabajo

| Fase | Qué | Notas |
|---|---|---|
| 0 | **El plan, el Rey y el Cerco** (**hecho**) | sobre la torre de antes, en la sala del alcaide |
| 0b | **Las respuestas** (**hecho**): este plan rehecho y el icono del rey de marfil | |
| 1 | **La torre del homenaje, rehecha** (**hecho**) | `level_torre.js`, por medidas; la navegación por capas con más plantas; `castlewalk torre` y `rey.mjs` siguen pasando |
| 2 | **La planta de armas, la ballesta y el alférez** (**hecho**) | el recorrido de §4.2; el arma (`game/virotes.js`: tiro, recarga, cuenta, cuerdas); el alférez (`entities/alferez.js`); la primera llave |
| 3 | **La planta baja y la bajada tapiada** | §4.3; la pared nueva en el pasillo de las celdas desde el principio |
| 4a | **El recinto del Paço** | la ciudad hacia el oeste, los muros, el foso del rey, el puente, la Puerta del Paço, el Patio de la Corte, la escalera de la coracha; zonas, mapa y descarte de lo que no se ve |
| 4b | **La Sala de la Corte y la Corte de los Infieles** | el cortesano, el director del compás, la llave del mayordomo |
| 4c | **Las Cámaras del Rey y el pasadizo** | la llave del camarero; el equilibrio hasta la torre |
| 4d | **La Capilla Real** | la tribuna, la espadaña, la llave del capellán |
| 4e | **La Cancillería y la Torre del Tombo** | el registro y las arcas, la llave del canciller |
| 4f | **Cocinas, caballerizas, jardín, pomar y torre de la reina** | el camino por el servicio; lo opcional |
| 4g | **La reja de las cinco llaves** | fuera la manivela; documentos; `progress.mjs` |
| 5 | **Por fuera** | muralla más alta, torres nuevas, barbacana, cadalsos, estandartes, la brecha; la silueta desde la ciudad |
| 6 | **Repaso** | documentos, sonido de cada sala, música del Paço, recorridos de prueba, rendimiento |
| 7 | **El Caballero de la Orden** | la escena de la luna (el plano lateral), el modelo, las habilidades, la defensa de armadura, la espada oxidada |

Cada fase deja el juego jugable de principio a fin.

## 12. Preguntas para el autor (las nuevas)

1. **¿Llaves o amuletos?** Van como cinco llaves de los cinco oficiales (la cerradura de cinco llaves tiene su
   lógica: las arcas de varias llaves existieron). Si prefieres amuletos, cambian el modelo y los textos.
2. **La Corte de los Infieles empieza al pisar el estrado.** ¿O prefieres que sea al coger algo del trono?
3. **El pasadizo quemado se cruza haciendo equilibrio** (de las cámaras a la torre). ¿O que no se cruce y sólo
   se vea?
4. **¿Se recogen los virotes disparados** de lo que no se rompe (madera, cuerpos)? Por ahora, no.
5. **El Caballero, en la terraza de la torre del homenaje** (lo más alto). Ahí estaba pensada la pelea con la
   Bestia de Carne, que ahora sólo es la huida: ¿la Bestia se queda en la huida, o su pelea va a otro sitio?
6. **¿Quién es el Caballero?** Va como un caballero de una orden militar, sin nombre (como el Rey). ¿Templario,
   de Évora (la que será de Avis), o del Rey sin más?

## 13. Riesgos técnicos

- **`level_castle.js` tiene casi 3.000 líneas** y la torre está escrita a mano, estancia a estancia: hay que
  pasarla a medidas (fase 1) antes de crecer.
- **La ciudad crece hacia el oeste**: la rejilla transitable, la losa de suelo y la de la navegación empiezan en
  x = −96 en varios sitios; pasan a x = −150 todas a la vez.
- **El rendimiento**: una zona del tamaño del Paço necesita estancias (`room`) y grupos para el descarte de lo
  que no se ve desde el primer día. La Corte son muchas criaturas a la vez: cuerpos baratos y sólo unas pocas
  con la IA completa (el director decide quién ataca).
- **La huida y el salto de fe** acaban en la atalaya y siguen por la coracha: el Paço no puede tocar ese camino.
- **La celda del principio está bajo la torre**: los cimientos de la torre nueva no pueden pisar las mazmorras.
- **La cripta honda** está debajo de parte del Paço (x −96 a −62, z −84 a −122): nada del Paço baja de y = −1.
- **El Cerco** corre en un hilo de fondo; si el navegador no deja abrirlo, piensa en el principal con poco tiempo.

## Fuentes

- La alcáçova de Coimbra, primer palacio real portugués desde 1131; la Sala dos Capelos fue la sala del trono y
  la capilla de San Miguel, su oratorio: [Universidade de Coimbra, Paço Real](https://visit.uc.pt/en/space-list/palacio_real),
  [Câmara de Coimbra, Património Mundial](https://www.cm-coimbra.pt/wp-content/uploads/2023/08/WORLD-HERITAGE_UK_V1_1.pdf).
- La sala grande y su servicio (despensa, botillería y cocina al extremo de la sala; la cocina aparte por el
  fuego; la cámara que es también tesoro; la capilla junto a la sala, a veces de dos alturas):
  [Great hall](https://en.wikipedia.org/wiki/Great_hall), [Winchester Palace](https://english-heritage.org.uk/visit/places/winchester-palace/history),
  [Norwich Castle, The Norman Palace](https://www.norwichcastle.norfolk.gov.uk/article/70365/The-Norman-Palace).
- Los oficios de la corte (mayordomo mayor, alférez mayor y canciller desde Afonso Henriques; Mestre Alberto,
  canciller en 1142): [Primórdios da chancelaria de D. Afonso Henriques](https://ap1.sib.uc.pt/bitstream/10316.2/47590/1/primordios_da_chancelaria_de_d._afonso_henriques.pdf),
  [Revista Portuguesa de História 44](https://ap1.sib.uc.pt/bitstream/10316.2/33431/1/rph44_artigo7.pdf).
- El archivo real en una torre de la alcáçova de Lisboa (la albarrana o torre del Haver, luego Torre do Tombo):
  [Torre do Tombo](https://www.infopedia.pt/apoio/artigos/$torre-do-tombo), [ANTT](https://antt.dglab.gov.pt/wp-content/uploads/sites/17/2016/05/Guardar-memorias-abrir-caminhos-ANTT.pdf).
- Las arcas de tres llaves (sólo se abrían con todos sus llaveros): [El Arca de los Privilegios](https://www.larioja.org/archivos-municipales/es/arca-privilegios).
- La chimenea de la cocina, el patio central y la capilla palatina de Sintra: [Palácio Real da Vila de Sintra](https://www.infopedia.pt/artigos/$palacio-real-da-vila-de-sintra),
  [Parques de Sintra](https://www.parquesdesintra.pt:443/media/m5kbj21j/sintra_pt.pdf).
- Los jardines (cuatro cuadros, arrayán, naranjos, la alberca): [Patio de los Arrayanes](https://archnet.org/sites/20887),
  [Real Alcázar de Sevilla](https://www.gardenvisit.com/garden/jardines_de_las_reales_alcazares).
- La barbacana, la coracha, la albarrana y la torre del homenaje metida en el muro entre dos recintos (Tomar):
  [Aedos (UFRGS)](https://seer.ufrgs.br/index.php/aedos/article/download/22304/13120/83157),
  [Castelo Rodrigo](https://aldeiashistoricasdeportugal.com/en/?p=8487).

## Apéndice: las respuestas del autor, tal cual

(Las preguntas eran las de la primera versión de este plan; se copian sin tocar.)

1. **¿El Rey o el alcaide?** Hecho con el Rey (§4.1); cambiarlo es poco trabajo.
   -Respuesta: Rey, posiblemente un Alfonso I de Portugal, sumamente deteriorado por la guerra. En esta historia alternativa, y como se dice en la intro, Portugal, en vez de haber logrado conquistar Lisboa, sufrió una grave contraofensiva por parte de los musulmanes. Lo que lo llevó a un grave estado de salúd, tal como se ve en el juego.
   
3. **¿Nombre para el Rey?** Ahora es sólo «el Rey» (sin fecha ni nombre que choque con la historia de verdad).
   -Alfonso I, aunque no vamos a nombrarlo como tal dentro del juego. No vamos a agregar diálogos respecto a ello. Documentos o notas dentro del castillo, sí. U otros personajes, pero el rey no se mencionará a sí mismo como Alfonso I. Tal cual como está integrado el rey actualmente, está bien. No lo toques.
   
5. **¿El Paço en el camino principal o como gran zona opcional?** Propuesta: principal, entrando por la coracha.
6. **¿Dónde va el Paço?** Al norte, bajo la coracha (propuesta), o al oeste, ampliando el mapa.

-Respuesta 5 y 6. Esta nueva área debe de ser de un tamaño GRANDE. En comparación, debería de ser aproximadamente del tamaño del 25% del mapa actual de la ciudad, un poco más, o un poco menos. Pero esto tiene una explicación. Hacen falta diseñar estas zonas: Palacio del Rey, Jardines del Palacio, Castillo y todo lo que conlleva. La idea es que busques información real, de cómo se componían este tipo de estructuras, para que sea una zona coherente y MUY BIEN DISEÑADA. La idea es que para abrir la compuerta de la Compuerta al interior de la Iglesia, al sótano. Se precisen 5 amuletos, o llaves por así decirlo. Aunque ahora que lo pienso no tiene mucha lógica en el lore. Pero debemos hacer que tengas que recorrer esta zona sí o sí para poder abrir la compuerta. Quitarémos el tema de la palanca, porque se ve demasiado soso tener que agarrar una palanca. 
   
8. **La ballesta**: ¿en la mano izquierda en lugar del escudo (propuesta), a dos manos, o como herramienta con
   virotes contados para puzles?
   -La ballesta se utiliza a dos manos. Todavía queda pensar cómo integrarémos el sistema de flechas/virotes. Por ahora, el único lugar en el que se podrán encontrar flechas y virotes será el castillo.
 
9. **¿Pelea en el Paço?** Un jefe propio (la corte arrodillada hecha una sola cosa, la reina...) o sólo
   criaturas.
   -Posiblemente sí. La Corte de los Infieles, se llamaría, y sería una batalla muy rítmica, con muchos enemigos. No sería un único boss. Serían todos los cortesanos del rey, que lo traicionaron. Quiero que metafóricamente sea parecido al intento de asesinato de Julio Cesar. Todos van a por ti con cuchillos. Algo así. Todavía queda pensarlo mejor, pero posiblemente sea algo como eso.

Vale, además de estos, va a haber un Boss Opcional, que va a ser el más difícil del juego, por lejos. Se va a encontrar en la parte más elevada del mapa. Posiblemente en la cima del Castillo, o en la cima del Palacio del Rey. Mirando la Luna, de forma melancólica, mientras el viento corre. Es un caballero, 
concretamente, el mejor de los hombres del ejército portugués. Apoyado sobre su espada, se da la vuelta y te observa. Ya contaminado por la infección.
Se pone en posición y la cámara se pone en un plano lateral. El Prisionero a la izquierda, y el Caballero de la Orden, a la derecha. El viento y las hojas pasan a sus lados, mientras la cámara se aleja lentamente. Luego el combate inicia. Los ataques del caballero son rápidos y son críticos automáticos. Tiene que tener varios ataques en los que avanza rápidamente en línea recta, o similares. La batalla tiene que sentirse intensa, rápida, muy ágil y con mucha frecuencia de ataques. La ventana que él deja para poder golpearlo, ha de ser muy muy baja. Prácticamente no deja puntos fáciles para atacarlo, y puede hacer parry a tus ataques si no lo toman desprevenido. La batalla tiene que sentirse casi como una danza. Este enemigo NO PUEDE tener los ataques de los enemigos típicos del juego, que son en su mayoría de un área muy muy baja, y se tienen que acercar mucho para pegarte. Este boss es de lanzar habilidades una tras otra de forma constante. La idea es que sea un combate DIFÍCIL, y requiera MUCHA MEMORIZACIÓN e ir BIEN PREPARADO. Va a tener una estadística, Defensa de Armadura. Todas las
armas a exepción de la espada del alemán, y la espada sagrada, hacen un tanto % menos de daño, en función de la calidad del arma. Por ejemplo la espada oxidada, que se agregará al juego hará un 50% menos de daño. Y así con cada una. La espada de Solstein, del alemán o como se le diga y la sagrada hacen un 0% más o menos de daño. No sufren este defecto. 

  
11. **La recompensa del Rey**: ahora, vitalidad si le ganas. ¿Otra cosa (su anillo, una llave del Paço)?
- Por ahora no va a haber recompensa mas que la pieza de marfil que necesita un rediseño de su sprite. Actualmente se ve muy feo su sprite actual.

