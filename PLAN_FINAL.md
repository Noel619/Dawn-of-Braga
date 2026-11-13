# El final: la terrible verdad (plan)

Plan de diseño y de trabajo del final del juego, empezado el 13 de noviembre de 2026, a partir de lo que pidió el
autor. **Todavía no hay nada hecho.** Manda sobre lo que dicen del final y de la naturaleza del dios
`PLAN_LORE.md` (§1, §3.2, §3.5, §4 y §6) y `PLAN_JEFE_FINAL.md` (el final del acto 6 y el §9).

## 0. Lo decidido

- **Un solo final.** Abres la puerta, peleas con el arzobispo (en la cisterna y en la película del gigante) y, al
  acabar, entiendes la verdad: miras al horizonte y, de donde estaba la estatua, sube al cielo un resplandor rojo
  sangre lleno de almas; el cielo se rompe en relámpagos, se vuelve negro y llueve sangre. Ése es el final de
  *Dawn of Braga*.
- **Es el principio de *Dawn of the Devil*.** Lo que este final deja abierto es de esa historia (§6).
- **Un final secreto, que no es canon** ni lo será: con la espada forjada (§4).
- **Descartado**: finales que dependan de lo que se hizo por el camino (contadores de deuda, de culpa o de caos,
  PNJ salvados, varios finales). Quizá un DLC, más adelante; ahora no.
- **Deo Ignoto es el dios de la abominación**: malo, destructivo y mortal. No da, no pacta y no devuelve nada:
  miente para que bajen, se queda con lo que toca y lo deforma. Las criaturas de Braga no son «lo que dieron,
  multiplicado»: son lo que hace su presencia en la carne. Fuera la regla del ara («Lo que se ofrece a la
  oscuridad, la oscuridad lo devuelve multiplicado»), la tabla de lo que cada uno le dio y la regla de escritura
  «multiplicar» (§5). En los textos del juego esa regla no llegó a escribirse: sólo está en los planes.

## 1. La terrible verdad

### 1.1 Lo que pasó de verdad

1. Martín de Dumio no pudo romperle (no se rompe lo que no se conoce) y le encerró tras su puerta con cuatro
   cerrojos: la mano, la sangre, el humo y los ojos. Esa puerta es la del infierno.
2. Desde dentro no se abre, y los suyos (los que se arrodillan) no rompen sus cerrojos. **Le hace falta alguien
   que no sea suyo.**
3. Le mintió al arzobispo desde el agua: que salvaría Braga si alguien bajaba a pedírselo de rodillas. El
   arzobispo abrió con la Garra, se arrodilló sobre la fuente y Él se quedó con él: es su cuerpo en la tierra.
4. Pero **un cuerpo también es una jaula**: mientras el arzobispo viva, Él sigue atado a la fuente, dentro de él.
   Paio y Mendo cerraron la puerta con los dos dentro. Desde entonces, el arzobispo canta.
5. Para salir le hacen falta dos cosas: **la puerta abierta y su cuerpo muerto.** Y alguien que no sea suyo para
   las dos.
6. Le dijo al arzobispo quién: el preso de la celda del fondo, el que no se arrodilla. El arzobispo le dejó el
   anillo, el incienso negro y el libro del rito: todo lo que hace falta para abrir. Cada vez que el preso cae,
   Él le levanta.
7. El preso quiere salir de Braga, y la única salida es la galería del río, detrás de la puerta. Descorre los
   cuatro cerrojos, abre y, para pasar, mata al arzobispo: a su cuerpo.
8. Con el cuerpo muerto, nada le ata a la fuente. Sube, y se lleva a todos los que se arrodillaron: las almas de
   Braga.

### 1.2 Lo que ya está sembrado (no hay que tocarlo)

| Dónde | Qué dice | Cómo se lee al final |
|---|---|---|
| Últimas palabras del arzobispo (`game/story.js`, `arzobispo`) | «Me ha hablado desde el agua: salvará Braga si alguien baja a pedírselo de rodillas.» «Me ha dicho quién: el preso de la celda del fondo.» «Si eres tú, condenado, toma mi anillo.» | Era mentira, y quien te eligió fue Él. |
| Libro del rito (`incienso`) | «Lo que San Martín cerró, yo lo abro.» | Te dejó escrito cómo se abre. |
| Dom Paio (`DIALOG`) | «Canta que caerás muchas veces, y que cada vez te levantarán. No sé quién.» «Mientras él siga cantando, la ciudad no despierta. Si abres esa puerta, que sea para hacerle callar.» | Le haces callar, y lo que despierta es Él. |
| Dom Paio, al descansar (`paioRest`) | «Reza por que sea el santo quien te levanta.» | No lo era. |
| La Garra (`ITEMS.garra`) | «Pesa como el plomo y nunca se enfría.» | — |
| La introducción | «Creyó que era un regalo.» «Desde entonces, canta.» «No todos.» | — |
| El README (la historia) | «Quien te levanta cada vez que caes es quien piensa usarte.» | — |

### 1.3 Lo que entiende el jugador y lo que no

Entiende que le usaron, que abrió la puerta del infierno, que al matar al arzobispo le soltó y que las almas de
Braga se van con Él. No se explica qué es (sigue sin nombre), adónde va, qué quiere ahora ni qué será del
Condenado: eso es de *Dawn of the Devil*.

## 2. El final, plano a plano

Sigue a lo de ahora, que no cambia: el corazón revienta, el gigante cae de espaldas al cráter y la sangre negra
se lo traga; amanece y tú, en el borde, a contraluz (`finale/film_heart.js`, `dawn()`). Lo que viene después
sustituye a la orilla de siempre y a su pergamino. Unos dos minutos. Sin voces, como todo el juego: rótulos en la
franja negra, con la letra de la introducción.

**Por qué en el río.** La sima de la estatua (`SANCT.idol`: x 0, z −139,8) está en el borde sur del cráter, a
una docena de metros de donde la película te deja: desde ahí no es el horizonte, es encima. Desde la punta del
embarcadero (`RIVER`, unos ochenta metros al norte), el campo, el cráter y la muralla de Braga son el horizonte,
y el sol sale a tu espalda: para mirar a Braga hay que darle la espalda al amanecer. Y el final de siempre se
vuelve la trampa: el jugador cree que ya ha acabado.

| # | Plano | Rótulo | Sonido |
|---|---|---|---|
| 1 | **La orilla** (los planos A y B de ahora): bajas al embarcadero y lo andas hasta la barca. El sol asoma tras la otra orilla. Si se tomó su remedio, el Desfigurado está en la orilla, de cara al sol. | — | La música del final. El río. |
| 2 | **El sol** (el plano C de ahora: a tu espalda, sobre el río): el sol sale... y se queda a medias. La música se corta en seco y el río deja de sonar. | — | Un silencio que zumba. |
| 3 | **La sombra**: en las tablas del embarcadero, tu sombra gira despacio hacia el río. La luz viene ahora de detrás, del sur, y es roja. | — | Un latido muy hondo, bajo la tierra. |
| 4 | **Te vuelves** (de frente, cerca): el Condenado se da la vuelta despacio. La cara del editor de personaje, con la luz roja encima. | — | — |
| 5 | **Braga** (por encima de su hombro, largo): el campo, el cráter que humea, la muralla, la Sé. Del sitio de la estatua sube una columna de luz roja hasta las nubes. | «Ha dejado de cantar.» | Un coro de miles de voces, sin palabras, que sube. |
| 6 | **Las almas** (teleobjetivo, la columna de cerca): dentro, cuerpos de luz que suben retorciéndose, con la boca abierta. Entre ellos se reconocen ecos con lo suyo: la mitra del arzobispo, la muceta de Dom Paio, Leonor con su hatillo, gente de Braga, almohades con turbante. | «Y la ciudad despierta.» | — |
| 7 | **El cielo se rompe** (contrapicado, desde el embarcadero): las nubes giran alrededor de la columna, se abren grietas rojas de lado a lado y caen los primeros relámpagos. | — | Truenos. Las campanas de Braga tocan solas, todas a la vez, una última vez. |
| 8 | **Lo que hiciste** (montaje: cada plano entra con un relámpago y se va con otro; ecos en los sitios de verdad, como en la introducción, con tu figura): tu eco levantándose del suelo de la celda, alzado por una mano que no se ve; la Garra que gira en la cerradura; las cadenas de las pilas y la sangre por los surcos; el incienso negro en el incensario grande; los Velados que caen; la puerta que se abre; el corazón que revienta. | «Cada vez que caíste, te levantó Él.» / «Lo que Martín cerró, lo abriste tú.» / «Su cuerpo era también su cadena. La rompiste tú.» | Un trueno en cada corte. |
| 9 | **El cielo negro** (de vuelta en el río, general): el último sol se apaga. El cielo, negro de lado a lado, con la columna roja y las grietas como única luz. | — | El viento. |
| 10 | **La lluvia** (cerca): las primeras gotas, rojas, en las tablas, en la barca, en el agua y en la cara del Condenado. Después el aguacero, y el río se vuelve rojo. | — | La lluvia en el agua y en la madera. |
| 11 | **De pie** (cerca, a su altura): todo lo que se arrodilló sube al cielo; él no se arrodilla. Se queda de pie bajo la lluvia, mirando. | — | — |
| 12 | **Lo último** (muy general y en alto; la cámara sube despacio dentro de la lluvia): el río rojo, el embarcadero, una figura diminuta de pie, Braga y la columna bajo el cielo negro y los relámpagos. Fundido a negro. | — | El coro se pierde arriba. Silencio. |
| 13 | **El pergamino** (§2.2). | — | — |
| 14 | **El título**: *Dawn of the Devil*, en rojo sangre, como el dorado de la portada al acabar la introducción: aparece con un trueno, se queda unos segundos y se va. | — | La campana, una vez. |

### 2.1 El Desfigurado

Si está en la orilla (plano 1), al oscurecerse el cielo se tapa la cara con las manos, como los que no quisieron
verle. Su línea del pergamino cambia (§2.2).

### 2.2 El pergamino

> Aquella mañana no amaneció sobre Braga.
> Llovió sangre tres días, y el Este se la llevó hasta el mar.
> Lo que Martín de Dumio cerró, lo abrió el que no se arrodilló.

El Desfigurado, con su remedio: «En la orilla, un hombre con media cara vendada llegó a ver salir el sol. Lo vio
poco.» Sin él, las líneas de la raya de candiles se quedan como están. Las cuentas (tiempo, muertes, documentos)
y «Volver al título», como ahora.

## 3. Lo que hay que hacer

### 3.1 El guion

- La escena deja de ser `ending()` y `updateEnding()` (`game/game.js`: un paseo con tres cámaras al reloj del
  juego) y pasa a ser una corrutina de la película (`finale/film.js`: planos, travellings, franjas y saltar),
  como el resto del final: `finale/film_verdad.js`, que arranca desde `dawn()` (`finale/film_heart.js`) en lugar
  de `g.ending()`. El paseo hasta la barca (planos A, B y C) se muda dentro tal cual.
- Los rótulos, con el sistema de la introducción (`intro/intro.js`, `say`).
- Saltar: manteniendo *interactuar*, como la introducción; se va al pergamino.
- Se guarda `flags.finished`, como ahora. No se puede morir: es todo cinemática.

### 3.2 El cielo

- Una atmósfera nueva, `apocalipsis` (`game/atmosphere.js`), y el paso desde `dawn`: el sol se queda a medias y
  se apaga (`uSun`), el cielo se vuelve negro, la niebla negra y roja, y la luz principal es la de la columna, del
  sur y roja.
- El cielo que se rompe: una bóveda sobre la escena con grietas rojas dibujadas por código (en un canvas, como las
  texturas), que se van abriendo; las nubes, un anillo que gira alrededor de la columna.
- Los relámpagos: rayos generados (líneas quebradas con ramas, aditivas, con bloom), el fogonazo de la pantalla
  (`game.flash`) y la ciudad iluminada un instante.

### 3.3 La columna de almas

- `finale/almas.js`: la columna (cilindros aditivos con ruido que se mueve, más ancha abajo, con bloom), con su
  base en la sima de la estatua, saliendo por el cráter.
- Las almas: cientos, instanciadas (pocas llamadas de dibujo), de unas pocas poses horneadas (subiendo,
  retorciéndose, con los brazos en alto, gritando), con el material de los ecos. Las que se reconocen (plano 6)
  son los ecos esculpidos de la introducción (`intro/ghost_models.js`).
- Desde el río se ven contra el cielo negro: la columna es lo que más luce de todo.

### 3.4 La lluvia de sangre

- `gfx/lluvia.js`, como la ceniza (`gfx/effects.js`, `AshSystem`): trazos rojos alrededor de la cámara,
  salpicaduras en las tablas y en el agua, ondas en el río (`gfx/water.js`) y el río que enrojece. El Condenado y
  las tablas, mojados y más oscuros.
- Cuánta lluvia, según el ajuste de resolución (`gfx/rendimiento.js`): que vaya en el teléfono.

### 3.5 El montaje (plano 8)

- En los sitios de verdad, como en la introducción, que ya mueve la cámara por el mundo: la celda, la cerradura
  de la Garra, las pilas, el incensario grande, la antesala de los Velados, la puerta y el cráter.
- Tu eco, con tu aspecto (`entities/aspecto.js`) y el material de los ecos.

### 3.6 El Condenado

Animaciones nuevas: darse la vuelta despacio en el embarcadero, alzar la vista y quedarse de pie bajo la lluvia
(la respiración, la cabeza algo gacha; nunca de rodillas).

### 3.7 Sonido y música

La música del final, cortada en seco en el plano 2; desde ahí, sin música hasta el título. El latido bajo la
tierra; el coro (el de la introducción, sin palabras, con muchas más voces, que sube); los truenos (horneados una
vez en un OfflineAudioContext, como los derrumbes de la película); la lluvia en el agua y en la madera; el viento;
las campanas de Braga que tocan solas (`bellToll`, desde varios sitios de la ciudad a la vez), y el silencio
final.

### 3.8 El título

*Dawn of the Devil* con `textBitmap`, como la portada (`game/ui.js`), con colores de sangre, y los mismos tiempos
que el título del final de la introducción.

### 3.9 Pruebas

- Una instancia del modo de pruebas, `final`, que empieza en el cráter tras el corazón.
- `tools/final.mjs`, como `tools/intro.mjs` y `tools/film.mjs`: un fotograma de cada plano, los errores, y que
  se llega al pergamino viéndolo entero y saltándolo.
- En el teléfono: el tiempo por fotograma con la lluvia y la columna.

## 4. El final secreto (no es canon)

- **Lo que hace falta**: la espada, forjada. En el código es el «objeto verdadero» (`TRUE_ITEM` y
  `hasTrueItem()`, en `finale/director.js`), que pasa a ser la espada.
- **Hasta el plano 5, igual.** Con la espada, al subir la columna, la hoja arde en tu mano y le enseña como es: las
  almas no suben; la columna se cierra sobre sí misma y es Deo Ignoto, que se alza de la sima.
- **La pelea contra Deo Ignoto**: la que ya existe (`deo_boss.js`, `deo_anim.js`, `climb.js` y `surface.js`), con
  su puesta en escena rehecha en el cráter (ya estaba anotado en el §9 de `PLAN_JEFE_FINAL.md`). Falta decidir si
  se corta al cráter o se vuelve corriendo desde el río.
- **Si le vences**: la espada le hiere para siempre; las almas se sueltan (blanquean y se dispersan), la columna se
  viene abajo, las grietas se cierran, el cielo negro se rasga y entra el amanecer. Y en el río, el final de
  siempre: el sol, la línea de siempre del Desfigurado y las campanas que callan.
- **Que no es canon, dicho en el juego**: por ejemplo, un rótulo antes del pergamino, «Así lo cuentan en los
  montes. No fue así.» (por decidir).
- **La espada**, con su propio plan (`PLAN_ESPADA.md`) cuando toque. Lo que ya está escrito (`PLAN_LORE.md`, §6):
  la forja Henrique con el acero de la espada de su padre (IN NOMINE DOMINI) y el Cerrojo de San Martín. Y como
  no se rompe lo que no se conoce, la espada puede llevar su nombre, juntado en tres trozos: la piedra de detrás
  del ara romana, el sermón de Martín y la memoria de Joana, la herbolera. Con el lore nuevo sigue valiendo: no
  es un pacto, es conocerle.

## 5. Lo que cambia en lo que ya está

| Dónde | Qué | Cambio |
|---|---|---|
| `PLAN_LORE.md` | §1 («La regla»), §3.2 (la regla, la tabla «qué le dio / qué le devolvió», «cada una es lo que dio, multiplicado»), §3.5 («Multiplicar»), §4 (los finales de cada plan) y §6 | Se tachan o se marcan como sustituidos por este plan. Las criaturas: lo que hace su presencia en la carne. |
| `PLAN_JEFE_FINAL.md` | Acto 6 («Y al final normal: el río al amanecer») y §9 | El final es el de este plan; Deo Ignoto, sólo en el final secreto. |
| `finale/director.js` | Las notas de la cabecera («el final normal») | Igual. |
| `game/game.js` | `ending()`, `updateEnding()`, `showEndingCard()` y `finalDesfigurado()` | La escena pasa a la película. El paseo con el amanecer de verdad se queda para el final secreto. |
| `game/desfigurado.js` | `alAlba()` y `npcAlba()` | En el canónico, se tapa la cara al oscurecerse el cielo. |
| `game/hitos.js` | El resplandor de la torre del Rey se apaga con `dawn` | Que se apague también con `apocalipsis`. |
| `intro/intro.js` | «Quiso pactar con lo que había dentro.» | Es lo que creía el arzobispo, y vale; si no debe sonar a pacto: «Se arrodilló ante lo que había dentro.» (por decidir). «Creyó que era un regalo.» se queda. |
| `README.md` | «La historia», el párrafo de la película («amanece, y el final de siempre, en el río»), el de Deo Ignoto y la lista de planes | La verdad, al final del párrafo que destripa; el final nuevo; este plan. |
| Henrique («Hizo un trato con el diablo») y Leonor («Dice que me lo devuelve si bajo a buscarlo») | — | Se quedan: es lo que ellos creían. Les mintió. |

## 6. Lo que queda para *Dawn of the Devil*

- Deo Ignoto, libre, sin cuerpo y sin nombre, con las almas de Braga.
- El Condenado, vivo y de pie en el río bajo la lluvia de sangre: el único que no se arrodilló, y el que le dejó
  salir.
- Qué es de las criaturas de Braga, adónde va Él y qué quiere ahora: nada de esto lo explica este final.

## 7. Preguntas

1. **¿Dónde se ve?** Desde la punta del embarcadero (*recomendado*, por lo del §2) o en el borde del cráter, nada
   más acabar la pelea.
2. **¿Los rótulos?** Los cinco de los planos 5, 6 y 8, menos, o ninguno (sólo imagen).
3. **¿El montaje del plano 8?** Es lo más caro después de la columna y la lluvia; sin él, la verdad la cuentan
   sólo los rótulos.
4. **¿El título *Dawn of the Devil* al final?**
5. **¿Cómo se dice que el final secreto no es canon?** Un rótulo, una marca en el menú, nada.
6. **¿Se cambia «Quiso pactar con lo que había dentro» en la introducción?**
7. **¿Qué hacen las criaturas de la ciudad** mientras sube la columna: se arrodillan hacia ella, suben con ella o
   nada?

## 8. Orden de trabajo

1. Los textos: lo del §5 en los planes y el README, el pergamino y los rótulos.
2. El animático: la escena como corrutina de la película, con sus planos, sus rótulos y sus tiempos, con la
   atmósfera de siempre y el saltar (que se pueda ver de principio a fin, aunque sea feo).
3. El cielo: la atmósfera, el sol, las grietas, las nubes y los relámpagos.
4. La columna y las almas.
5. La lluvia de sangre y el río rojo.
6. El Condenado (darse la vuelta, de pie bajo la lluvia) y el Desfigurado.
7. El montaje de los ecos.
8. El sonido.
9. El título y el pergamino.
10. Pruebas (`tools/final.mjs` y el modo de pruebas), el teléfono, el README y la versión jugable
    (`npm run build:play`).
11. Más adelante, con su propio plan: la espada y el final secreto.
