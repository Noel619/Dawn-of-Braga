# El castillo, otra vez: castillo, palacio del rey y sede de la corte

Plan de diseño y de trabajo, empezado el 30 de octubre de 2026, a partir de lo que pidió el autor:

- El castillo se queda **pequeño**. Tiene que ser **mucho más grande** (seguramente con **un área nueva
  entera**) y **mucho más épico, por fuera y por dentro**, porque es a la vez **castillo, palacio del rey y sede
  de la corte**.
- **No hay prisa.** Se hace por fases; esta primera sólo adelanta trabajo.
- **La torre del homenaje**, planta a planta:
  - **Arriba** (alcoba, escritorio y sala del alcaide): un **personaje que estará sí o sí en el juego final**
    (el rey o el alcaide), al borde de la muerte, que quiere jugar contigo **una última partida a su juego
    preferido**, en el tablero con fichas de la sala. Un **juego de estrategia de verdad**, con su complejidad,
    y él juega bien. Si le ganas, o si llegáis a **tres partidas** sin que le ganes, **muere igualmente**. Una
    escena triste, dura de ver: alguien que lo ha perdido todo y quiere un último rato feliz para no irse
    amargado y roto. Sus movimientos, sus gestos y sus animaciones tienen que decir que está muy mal.
  - **En medio** (cuerpo de guardia, taller del ballestero, armería): un área **amplia** donde se consigue **la
    ballesta**, y que cueste: escombros, pasos tapiados, rodeos; la ballesta, al final del recorrido.
  - **Abajo** (almacén, granero, bodega y pozo de la torre): rehecha para que baje a **las catacumbas** que
    llevan a las celdas, con ese paso **tapiado** (y que se pueda abrir).
- **En esta tanda: el plan, el juego de mesa y el personaje. Nada más** (**hecho**: §4.1, §5 y §6).

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
adarve del castillo → la poterna → la sala del alcaide → el torno del puente levadizo → otra vez el patio (el
atajo).

Por qué se queda pequeño:

1. **No hay palacio ni corte.** Es un cuartel: ni sala del trono, ni capilla real, ni cámaras del rey, ni
   cancillería. Nada dice que ahí viva un rey.
2. **La torre no manda.** Desde la ciudad se pierde entre los tejados; desde el oeste es una caja. Una torre del
   homenaje tiene que verse desde cualquier calle.
3. **Las plantas son cuatro cuartos.** En 300 m² no cabe un recorrido (la ballesta pide uno), y la planta baja es
   un callejón sin salida al que sólo se baja por la trampilla.
4. **Por fuera, una muralla con almenas, la torre-puerta y nada más**; al oeste, el vacío.

## 2. La idea: la alcáçova de Braga

**Braga fue corte de reyes**: la de los suevos, a los que bautizó San Martín de Dumio (el de los cerrojos;
anclaje real), y es la sede del primado. Cuando el sur empezó a caer («desde hace tres años Portugal pierde
tierra»), el rey subió con su corte a la ciudad vieja. No hace falta fecha ni nombre: **el Rey**.

El castillo es tres cosas, y cada una con su cara:

| Cuerpo | Qué es | Qué se ve |
|---|---|---|
| **El castillo** | la guarnición y la defensa | el patio de armas, las murallas y sus torres, la barbacana, la torre del homenaje |
| **El Paço** | la casa del rey | cámaras, la capilla real, cocinas, caballerizas, un jardín |
| **La corte** | donde se gobierna | la sala de la corte (el trono), la cancillería, el tesoro, el tribunal |

**Lo que pasó** (para escenarios y documentos): la noche de la campana la corte velaba en la sala grande; la
campana tocó sola y los que la oyeron se arrodillaron, la corte entera con ellos. El Rey también. El alcaide se
lo llevó a rastras a la torre del homenaje, el último reducto, y alzó el puente («que no suba nadie del patio»:
la orden que ya está escrita). El alcaide murió sobre sus cuentas. El Rey se quedó solo, sentado a la mesa de su
juego, esperando a que subiera alguien que no quisiera comérselo.

**Sus armas**: las del rey, no las negras de la guarnición. Estandartes blancos con la cruz azul (las primeras
armas de Portugal) en el Paço y en lo alto de la torre; los negros, en las murallas.

## 3. El plano nuevo (propuesta)

**Dónde.** Al norte del castillo, entre él y la muralla norte, a poniente de la coracha: hoy son manzanas de
relleno (de x = −96 a −62 y de z = −30 a −105, unos 34 × 75 m). Si hace falta más, la malla de la ciudad crece
hacia el oeste (x = −96 → −126): ahí no hay nada.

```
                      muralla norte (z ≈ −124)          Torre del Fanal
   ┌───────────────────────────────────────────────┐ [atalaya]
   │   JARDÍN DEL REY (claustro con fuente)         │  ║
   │                                                │  ║  la coracha
   │   CAPILLA REAL        SALA DE LA CORTE         │  ║  (adarve alto
   │   (ábside, espadaña)  (el trono, las mesas)    │  ║   sobre el Paço)
   │                                                │ [torre de la coracha]
   │   CÁMARAS DEL REY     PATIO DE LA CORTE        │  ║
   │   y torre de la reina (pórtico, escalinata)    │  ║
   │   CANCILLERÍA · TESORO · COCINAS · CUADRAS     │  ║
   └──────────┬───────[puerta del Paço]─────────────┘  ║
              │ pasadizo     FOSO DEL REY (puente)      ║
   ┌──────────┴─[TORRE DEL HOMENAJE, rehecha]──────────╨──┐
   │                                                      │
   │   PATIO DE ARMAS (el de ahora)                       ├─[torre-puerta
   │                                                      │   y barbacana]
   └──────────────────────────────────────────────────────┘
```

- **La torre del homenaje, de bisagra.** Rehecha más grande (unos 26 × 26 m y cuatro plantas más la terraza,
  ~22 m: el doble de alto que la muralla), a caballo de la muralla norte del castillo: su cara sur al patio de
  armas y la norte al foso del rey. De su planta alta sale un **pasadizo cubierto** hasta las cámaras del rey
  (por ahí huyó; lo quemaron detrás de él).
- **El foso del rey**: el foso seco que ya está (con sus estacas y su horca), más hondo, con un puente de piedra
  hasta la puerta del Paço.
- **La coracha** sigue donde está, pero ahora corre por encima del Paço: desde el adarve se ven el patio de la
  corte y el jardín, abajo, y la torre de la coracha tiene una escalera que baja al jardín.
- **El castillo**: muralla a 11–12 m, cinco torres nuevas (dos albarranas), cadalsos de madera en las torres, la
  barbacana delante de la torre-puerta (doble puerta y foso) y la brecha de un tiro en la muralla sur.

**El recorrido** (para decidir, ver §8): el Paço puede ser **una zona del camino principal** o **una gran zona
opcional**. Propuesta: se entra la primera vez **por la coracha** (la escalera de su torre baja al jardín) y se
sale **por el pasadizo** a la torre del homenaje, donde espera el Rey; o al revés. El puente del foso y la puerta
del Paço, atrancados por dentro: el atajo al patio de armas.

## 4. La torre del homenaje, planta a planta

### 4.1 Arriba: el Rey y su juego (**hecho**)

**¿El Rey o el alcaide?** El Rey. Lo pide todo lo demás: el castillo pasa a ser palacio y corte, y «alguien que
lo ha perdido todo» es, más que nadie, un rey sin reino, sin corte y sin hijos. Y deja en su sitio lo que ya
está escrito: el alcaide sigue muerto sobre sus cuentas en el escritorio, con la manivela y su última orden.
Cambiarlo por el alcaide es cuestión de nombre, ropa y frases (`game/rey.js`, `entities/rey.js` y `DIALOG` en
`story.js`): el juego, la escena y las animaciones valen igual.

**Quién es.** Un viejo enjuto, de pelo y barba blancos, con la corona de oro ladeada, el manto forrado de piel
sobre los hombros y una manta sobre las rodillas. Sentado en un sitial de respaldo alto, al sur de una mesa de
juego, bajo el arco diafragma de la sala. Cuando sonó la campana **se arrodilló**, como todos, y desde entonces
algo le come por dentro: tose negro, tiembla, se le van las fuerzas. No le piensa dar el gusto: **quiere morirse
siendo él**. Desde ahí arriba oía, de noche, al preso de la celda del fondo rascar la pared: sabe quién eres.

**Lo que quiere.** Una partida a **El Cerco**, el juego que le enseñó su padre en esa misma torre. Él lleva a
los de fuera; tú, al rey: «A ver si tú sabes sacarlo de aquí. Yo no supe».

**La escena.**

1. **Al entrar** (por la poterna o por la escalera), está inclinado sobre el tablero, con la mano en la barbilla,
   murmurando cómo van las piezas. Al verte intenta levantarse: se agarra a los brazos del sitial, se alza un
   palmo y las piernas no le sostienen; cae otra vez, tosiendo.
2. **Hablar** con él: quién es, qué pasó, qué quiere (unas pocas frases; se pueden pasar con «interactuar»).
   Luego, **sentarse a jugar** (el plano de cerca de los osarios: la cámara sobre el tablero y él enfrente).
3. **Antes de la primera partida** te explica las reglas en cuatro frases y te deja el pergamino con ellas
   (un documento: se puede releer en cualquier momento, también desde la mesa).
4. **Las partidas.** Él piensa (la mano en la barbilla, la vista fija), alarga el brazo, coge la pieza con
   dedos que tiemblan, la lleva por el aire, la deja con un golpe seco y retira la mano. Comenta lo que pasa
   (lo que mata, lo que pierde, cuando tu rey se asoma a un borde), recuerda (su padre, su reina, sus hijos,
   su alcaide, Don Gonçalo) y, cada vez más, **tose** (se dobla, el pañuelo a la boca, lo mira: negro),
   **jadea**, **se adormila** mientras piensa (la cabeza se le cae; despierta de golpe: «¿Me toca?») y **le
   cuesta alcanzar** las casillas lejanas. Juega peor según se apaga: en la primera partida, a su mejor nivel;
   en la tercera, se le escapan cosas («Antes no me habría dejado eso...»).
5. **Si le ganas** (en cualquiera de las tres): se queda mirando el tablero. «Ha salido.» Se ríe, de verdad,
   hasta toser. Coge tu rey del borde, te lo tiende por encima de la mesa —«Llévatelo. Sácalo de aquí
   de verdad»— y, cuando lo tomas, se echa atrás en el sitial y cierra los ojos. Ya no los abre.
6. **Si pierdes las tres**: «Tres». Se ríe, flojo, y se pone a colocar las piezas otra vez: «Otra. Una más. La
   última, te lo prometo». Coloca tres de las suyas, cada vez más despacio, murmurando; la cuarta es tu rey, y a
   medio camino del trono se le para la mano. La pieza se le cae y él se queda así, doblado sobre el tablero.
7. **Después**, su cuerpo sigue en el sitial y el tablero como quedó (también al cargar la partida). Lo que te
   deja es la misma pieza, **el rey de marfil**: si le ganaste, te lo dio él (una mejora: vitalidad); si no, lo
   recoges de donde se le cayó (un recuerdo, nada más).

Las tablas (por repetir posiciones o por llegar al límite de jugadas) cuentan como partida no ganada. Si te
levantas a media partida, la pierdes («En el Cerco, el que se levanta, pierde»): se avisa y hay que confirmarlo.

**Lo que cambia en la planta**: la mesa del plano (el pergamino con las fichas rojas y blancas) pasa a la mesa
del consejo, al otro lado del arco; en su sitio, la mesa de juego con el tablero, el sitial del Rey, el banco
para ti, velas, su copa y el pañuelo. La Plañidera que esperaba en la sala pasa a la alcoba (con la sala llena
de una partida a vida o muerte, no podía quedarse a cuatro pasos).

### 4.2 En medio: la planta de armas y la ballesta

**Lo que es.** La planta de la guerra: el cuerpo de guardia (con el torno del puente), la armería, el taller del
ballestero, el pañol de los virotes, el dormitorio de los ballesteros y la galería de saeteras. Con la torre
rehecha, **unos 600 m²** y pasillos en el grosor del muro (como en las torres románicas de verdad).

**Por qué cuesta.** Un bolaño de los sitiadores entró por el muro norte y se llevó el suelo del taller; los de
dentro tapiaron lo que quedaba para que no subiera lo que había abajo. La ballesta del maestro ballestero está al
fondo, sobre su banco, al otro lado del hundimiento.

**El recorrido** (una propuesta):

1. Del cuerpo de guardia al taller, el paso directo: **escombro** hasta el techo (no se pasa; se ve la luz del
   taller entre las piedras).
2. La armería, **atrancada con tablones** (la palanca): picas, yelmos, la cota del alcaide y, en el suelo, el
   agujero del bolaño, que da al granero de abajo.
3. **Abajo** (planta baja), a oscuras: ratas, los que comen, y el montacargas del pañol, con su cuerda.
4. **Subir por la cuerda** del montacargas al pañol de virotes (una pulsación sostenida, como las palancas;
   si algo te golpea, caes).
5. Del pañol, por una saetera ensanchada a mazazos, **al cadalso**: la galería de madera colgada por fuera de
   la torre. Viento, tablas rotas que ceden al pisarlas y, en la esquina, **un ballestero** convertido que
   dispara desde una garita (aprendes lo que hace una ballesta recibiéndola).
6. Por la ventana del taller, **dentro**: el suelo inclinado hacia el hueco, vigas colgando, el maestro
   ballestero muerto bajo una viga, con **la ballesta** en el banco.
7. **El atajo**: el tabique tapiado entre el taller y el cuerpo de guardia se derriba desde dentro.

**La ballesta** (para decidir, ver §8): un arma de distancia en un juego de espada y escudo. Propuesta: va **en
la mano izquierda, en lugar del escudo**; se dispara con la guardia (apuntando a lo que tienes fijado), se
recarga con el estribo (casi dos segundos, quieto y a merced), los virotes se cuentan (se recogen en cajas y en
los cuerpos de los ballesteros) y el tiro **desequilibra** a las criaturas pequeñas y corta cuerdas y cadenas
(puzles y atajos: el contrapeso del rastrillo, la jaula colgada del tormento, la campana del Paço).

### 4.3 Abajo: los víveres y la bajada tapiada

**Lo que es.** Los víveres del asedio, más grandes y más vacíos: el almacén, el granero, la bodega y el pozo de
la torre (que baja al aljibe), y ahora **la escalera de caracol** que bajaba a la cárcel y a las catacumbas.

**La celda del jugador está debajo de la torre** (la celda del fondo, en x = −87,6, z = −16,2). Eso ya lo cuenta
el Rey («te oía rascar») y lo aprovecha el atajo:

- **Desde abajo**, al principio del juego, en el pasillo de las celdas: una **pared de ladrillo nuevo**,
  todavía con la cal fresca, donde antes había una puerta. Arañado en ella: LO QUE SUBE NO ES NUESTRO. No se
  puede hacer nada (todavía).
- **Desde arriba**, en la bodega de la torre: la puerta de la escalera, **tapiada con sacos, piedras y cal**.
  Se derriba con lo que dé la planta de armas (un mazo de cantero de la armería, o un tiro de ballesta a la
  cuerda del contrapeso que sostiene un sillar sobre ella).
- **Abierta**, une la torre con las celdas y las catacumbas: un atajo de vuelta al principio, como manda el
  género. Y deja ver lo que subía: el rastro de algo grande que arañó la escalera desde abajo.

La trampilla del pañol sigue (la escalera de mano es la otra bajada) y el pozo de la torre se puede usar para
bajar al aljibe colgado de su cuerda (una vez, y sin vuelta).

### 4.4 Lo alto: la terraza

Donde se peleará con la Bestia de Carne (el escenario está listo; la pelea, todavía no). Con la torre rehecha,
más ancha y más alta, con garitas en las esquinas, el matacán, el estandarte del rey y la vista del Paço.

## 5. El Cerco (el juego de mesa) — **hecho**

### Por qué este juego

De la familia de los *tafl* (el *tablut* que anotó Linneo, el *hnefatafl* de los nórdicos): **un rey cercado en
el centro que tiene que escapar, y una hueste que tiene que atraparlo**. Es exactamente la historia del juego:
Braga sitiada y alguien que quiere salir de ella. Reglas que se dicen en un minuto y que dan para años. Y es
asimétrico, lo que da la escena: **tú llevas al rey** (el que no supo salir), **él lleva a los de fuera**.

### Las reglas (como las cuenta el pergamino)

- **El tablero**, de 9 × 9. En medio, **el trono**. La fila de fuera, en madera clara, son **las afueras**.
- **Los de dentro** (marfil): **el rey**, en el trono, y **sus ocho**, en cruz a su alrededor. **Los de fuera**
  (madera teñida): **dieciséis**, cuatro en medio de cada lado.
- **Empiezan los de fuera.** Se mueve una pieza por turno, **en línea recta, tantas casillas como se quiera**
  (como el roque del ajedrez), sin saltar a nadie.
- **El trono es sólo del rey**: nadie más se para en él ni pasa por encima.
- **Se mata cogiendo en medio**: una pieza queda muerta si, al mover, la dejas entre dos de las tuyas en línea
  (en horizontal o en vertical). Meterse uno mismo entre dos enemigos no mata. El rey también mata.
- **El trono vacío muerde**: cuenta como enemigo de los de fuera siempre, y de los de dentro cuando está vacío.
- **El rey gana si llega a cualquier casilla de las afueras.**
- **Los de fuera ganan si atrapan al rey**: en el trono, rodeándolo por los cuatro lados; junto al trono, por los
  tres que le quedan; en cualquier otro sitio, cogiéndolo en medio como a cualquiera.
- **Tablas** si la misma posición se repite tres veces o si se llega a las ciento sesenta jugadas.

### Cómo juega él

Búsqueda alfa-beta con profundización iterativa, tabla de transposición y ordenación de jugadas, en un hilo de
fondo (`game/cerco/ai.js` y su worker; si el navegador no deja abrir el hilo, en el principal con un tiempo
corto). Una **búsqueda de amenazas** al final de cada rama: si el rey tiene una línea libre a las afueras, los de
fuera sólo pueden tapar; si tiene dos, está perdido. Así ve las horquillas, que es como se gana a este juego. La
evaluación pesa el material, las líneas libres del rey, a cuántas jugadas está de las afueras si sólo le cerraran
el paso los de fuera, cuántos de fuera le pegan y si el cerco está cerrado.

Su fuerza depende de **cómo está** (`game/cerco/levels.js`): en la primera partida busca hasta seis jugadas de
hondo y no regala nada; en la segunda, a veces juega cansado (menos hondo y viendo peor: una jugada peor que la
mejor, nunca una que pierda en el acto); en la tercera, más a menudo y con menos tiempo, y se adormila. Medido
contra jugadores de prueba (`node tools/cerco.mjs liga`): el de la primera partida les gana a todos, también al
que mira cuatro jugadas; el de la segunda y el de la tercera ya pierden contra los que miran tres o cuatro.
**Piensa** entre dos y cinco segundos aunque la búsqueda tarde menos: es teatro.

### Cómo se juega

La cámara sobre el tablero, desde tu sitio, en tu turno; en el suyo, más atrás, con él en el plano. Teclado:
W A S D o las flechas mueven el cursor, E elige la pieza y la casilla (se marcan las casillas a las que puede ir:
en rojo, las que matan; en blanco, la que sale), Esc suelta la pieza (y, sin pieza elegida, pide levantarse: hay
que pulsarlo dos veces), R abre las reglas y P, la pausa. Mando: cruceta o stick, A, B, X y Start. Sentado, el
ratón va suelto: el cursor sigue a la casilla que tiene debajo y el clic izquierdo elige. Su última jugada queda
marcada en el tablero. Las piezas muertas se tumban y se van a los lados del tablero. Arriba, el marcador
(«Partida 1 de 3 · Mueves tú»).

## 6. El Rey (el personaje) — **hecho**

- **El cuerpo** (`entities/rey.js`): esqueleto humanoide con mandíbula y párpados propios. Cara chupada, ojos
  hundidos y ojerosos, nariz afilada, pelo y barba blancos y largos, la corona ladeada; la túnica, el manto
  forrado de piel y la manta; las venas negras en el cuello y en las manos; el anillo del sello; el pañuelo.
- **Cómo está**, en capas que se suman a lo que haga: la respiración (corta y dura, con alguna bocanada honda y
  su silbido), el temblor de manos y cabeza, los parpadeos lentos y los ojos a medio cerrar, la cabeza que se le
  va cayendo, el ataque de tos (cada vez más a menudo, también al reírse), el dolor (la mano al costado).
- **Lo que hace**: colocar piezas, pensar, alargar el brazo (cinemática inversa del brazo hasta la casilla, con
  el pecho inclinándose cuanto más lejos está), coger, llevar y dejar; intentar levantarse; asentir; reír;
  adormilarse; tender la pieza; morir (dos maneras: echado atrás con los ojos cerrados, o doblado sobre el
  tablero con la cabeza caída).
- **La voz**: la del juego para los personajes, grave y rota, con el aire que le falta; la tos, el silbido del
  pecho y la risa, sintetizados como todo lo demás.
- **La música**: en la mesa, un salterio lento y cansado con una frase de zanfona de cuando en cuando (el tema
  `cerco`); al morir, un lamento de cuerdas, coro y una campana lejos (`reyFin`).
- **Banderas** (en la partida guardada): `rey:met`, `rey:partidas` (cuántas ha jugado), `rey:ganada`,
  `rey:muerto` y `take:` de lo que deja.

## 7. Fases y orden de trabajo

| Fase | Qué | Notas |
|---|---|---|
| 0 | **El plan, el Rey y el Cerco** (**hecho**) | sobre la torre de ahora, en la sala del alcaide |
| 1 | **La torre del homenaje, rehecha** | estructura, plantas y escaleras con medidas en un solo sitio (hoy, cada estancia tiene sus coordenadas escritas a mano en `level_castle.js`: pasan a `level_torre.js`, generadas a partir de unas pocas constantes); la navegación por capas (`navKeep`) con más plantas; el recorrido de siempre sigue funcionando (`tools/castlewalk.mjs torre`) |
| 2 | **La planta de armas y la ballesta** | el recorrido de §4.2; el arma de distancia (proyectil, recarga, virotes, fijado); el ballestero convertido |
| 3 | **La planta baja y la bajada tapiada** | §4.3; la pared nueva en el pasillo de las celdas desde el principio |
| 4 | **El Paço y el foso del rey** | la zona nueva (§3): estructura, salas, la corte arrodillada, criaturas propias, documentos; la malla de la ciudad hacia el oeste; zonas, mapa y descartado de lo que no se ve |
| 5 | **Por fuera** | muralla más alta, torres nuevas, barbacana, cadalsos, estandartes, la brecha; la silueta desde la ciudad |
| 6 | **Repaso** | documentos, sonido de cada sala, música del Paço, recorridos de prueba, rendimiento |

Cada fase deja el juego jugable de principio a fin.

## 8. Preguntas para el autor

1. **¿El Rey o el alcaide?** Hecho con el Rey (§4.1); cambiarlo es poco trabajo.
2. **¿Nombre para el Rey?** Ahora es sólo «el Rey» (sin fecha ni nombre que choque con la historia de verdad).
3. **¿El Paço en el camino principal o como gran zona opcional?** Propuesta: principal, entrando por la coracha.
4. **¿Dónde va el Paço?** Al norte, bajo la coracha (propuesta), o al oeste, ampliando el mapa.
5. **La ballesta**: ¿en la mano izquierda en lugar del escudo (propuesta), a dos manos, o como herramienta con
   virotes contados para puzles?
6. **¿Pelea en el Paço?** Un jefe propio (la corte arrodillada hecha una sola cosa, la reina...) o sólo
   criaturas.
7. **La recompensa del Rey**: ahora, vitalidad si le ganas. ¿Otra cosa (su anillo, una llave del Paço)?

## 9. Riesgos técnicos

- **`level_castle.js` tiene casi 3.000 líneas** y la torre está escrita a mano, estancia a estancia: hay que
  pasarla a medidas (fase 1) antes de crecer.
- **El rendimiento**: una zona del tamaño del Paço necesita estancias (`room`) y grupos para el descarte de lo
  que no se ve desde el primer día.
- **La huida y el salto de fe** acaban en la atalaya y siguen por la coracha: el Paço no puede tocar ese camino.
- **La celda del principio está bajo la torre**: los cimientos de la torre nueva no pueden pisar las mazmorras.
- **El Cerco** corre en un hilo de fondo; si el navegador no deja abrirlo, piensa en el principal con poco tiempo
  (se nota algo menos fuerte, nunca un parón).
