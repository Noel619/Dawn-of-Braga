# El lore y la introducción (plan)

Plan de diseño empezado el 24 de octubre de 2026. Dos encargos: fijar un rumbo definitivo para la historia, coherente
con lo que el juego ya cuenta (para no rehacer el contenido), y planificar una **cinemática de introducción** a la
manera de las de *Dark Souls* o *Elden Ring*: un mito contado en dos minutos y medio que deje al jugador en la celda
sabiendo lo justo. **Todavía no hay nada hecho.** Aquí están lo que no encaja, lo que se puede fijar ya, tres planes
para elegir, la intro escrita plano a plano y las preguntas que hay que contestar antes de tocar una línea.

## 0. Lo decidido y lo hecho (25 de octubre)

Contestadas las preguntas (§7), lo que manda ahora es esto; el resto del documento queda como el plan de partida.

- **El plan B, a la manera del autor.** Deo Ignoto es una fuerza de la oscuridad, mala sin más, y **nadie lo sabe**:
  ni el arzobispo (los papeles de los romanos se perdieron hace mucho). Arrodillarse ante él es ceder, no un trato:
  no te devuelve nada. El arzobispo bajó a pedirle que salvara Braga, se arrodilló sobre la fuente y lo de dentro se
  quedó con él: es su cuerpo en la tierra. En la cisterna, lo que une al dios con el mundo es **la fuente sin
  nombre**: la reja de Martín con el boquete, el agua roja y **el ídolo sin mano**. Lo que ata al arzobispo con ella
  **no se ve** (nada de cordón de carne: es cosa del dios, no de la carne).
- **El ídolo es un monolito** (lo decidió el autor: la estatua parecía un robot). Grotesco, tribal, algo que se
  mira y no se entiende del todo: una piedra de pie que nadie labró, tosca y vencida hacia el que se arrodilla, con
  la cima rota y hueca, **llena de almas**: caras y manos que empujan la piedra desde dentro, de todos los tamaños,
  con la boca abierta en un grito y luz dentro; de vez en cuando una grita de verdad y se la oye **pedir auxilio**,
  ahogada (las vocales de «¡auxilio!», sin la palabra). Por el costado, una grieta encendida con manos agarradas a
  los bordes; por la espalda, espinazo y costillas; del hueco de arriba, brazos que se estiran o se agarran al
  borde y, entre ellos, **uno negro y sin mano: la mano de oro es la Garra**, la que Martín le cortó y escondió con
  los Inocentes y la que hoy lleva el jugador (por eso en la lámina II, con los romanos, la tiene). Lo tribal es lo
  de los castros: anillos picados alrededor del ojo, espirales, cazoletas, un laberinto, dientes de sierra y manos
  en negativo de almagre; lo de Martín, los dos zunchos de hierro. El ojo, en la cara de delante: la piedra se
  retira como unos párpados y lo de dentro (pupila de cabra) mira. La estatua sigue en el modo de pruebas (F2,
  «Diseño»), para comparar; cuál se ve se recuerda en el navegador.
- **Los ecos tienen personalidad**: figuras esculpidas, cada una con su cara y con lo suyo (la mitra, el palio y el
  incensario del arzobispo; la capucha, la barba partida, el cayado y el farol de Martín...). El arzobispo de la
  cisterna, la primera forma del jefe, anuncia al coloso: la joroba, la jaula por cara, la mitra partida en dos
  cuernos y la aureola de cirios.
- **«No todos.»** La campana no dobló a todos los que la oyeron: el preso no fue el único que no se arrodilló, sólo
  el más fuerte de los que quedaron (en la intro, tras «Los que la oyeron se arrodillaron.»).
- **La puerta.** Una sola puerta, la de los cuatro pasos, sella al dios. El arzobispo la abrió con la Garra; dos
  canónigos (Paio y Mendo) le arrancaron la llave y la cerraron con él dentro.
- **El preso.** Nada de un acto público de «no arrodillarse»: la campana y el contagio doblan a la gente por dentro;
  él resistió, y le costó las uñas (NO TE ARRODILLES, escrito con sangre por las paredes de su celda) y parte de la
  memoria. No es un elegido porque sí: es el más fuerte de los que quedaron, y **le levanta quien piensa usarle**.
  Dom Paio sabe de él porque oye al arzobispo cantarlo por la reja de la Confesión, y le avisa de su propia
  ignorancia: que nadie sabe lo que hay tras la puerta y que no se crea más fuerte que ello.
- **El carcelero** deja sin comer al de la primera celda (un infectado), no al preso, que está en la última.
- **1167 y los almohades.** Desde 1164 Portugal pierde tierra ante ellos (en este mundo, casi la mitad); en octubre de
  1167 llegan a Braga. Son enemigos normales, sin pacto ninguno: lo que pasó, pasó por Braga.
- **El dios no tiene nombre**: Deo Ignoto, y así se queda.
- **El facón y la katana**, fuera de la historia: quedan para huevos de pascua. **La rogativa** y lo del humo que
  infecta la ciudad, descartados. **El final**, por ahora igual (queda la idea de una sola vida tras liberarlo, más
  de película).
- **La introducción**, en tiempo real en los sitios de verdad, con los ecos (figuras de luz). Hay dos:
  - **la de empezar partida**, corta (~80 s) y a la manera de FromSoftware: frases sueltas que despiertan misterio
    sin resolver nada, casi a oscuras, sin enseñar lo que luego se juega (ni la puerta, ni los Velados, ni el pacto);
  - **la Crónica de Braga**, la larga (~3 min), que lo cuenta todo en orden; se desbloquea en el menú del título al
    vencer al arzobispo (o con `?cronica=1`).
- **Dos láminas**, dibujadas (no en 3D) como grabados iluminados, en `arte/bocetos/`, ya con el monolito (el del
  juego, visto con la cámara de cada lámina): **I · El arzobispo, consumido** (de rodillas y de espaldas ante él,
  con los brazos en alto, el ojo abierto y las almas que gritan, la cisterna roja hasta los bordes y los que se
  arrodillaron en la penumbra) y **II · Los que la encontraron primero** (los romanos rompen la roca a la luz de las
  antorchas y dan con él, todavía con la garra de oro en alto). Las de la estatua quedan en
  `archive/bocetos_estatua/`. Se dibujan con `tools/bocetos/`.

## 1. Lo que el juego ya cuenta

En pocas líneas, lo que dicen los documentos, los diálogos y los escenarios:

- **Bajo la Sé hay tres épocas** (ver `PLAN_CRIPTA_HONDA.md`): el santuario romano de un dios sin nombre (un
  manantial bajo una cúpula, la cisterna, y su basílica, la antesala); la cripta-iglesia de **San Martín de Dumio**,
  que no rompió la puerta del dios y la cerró con **cuatro cerrojos** (la Garra, la sangre de las tres pilas, el humo
  y los Velados), y la Sé románica encima.
- **El asedio** dura al menos catorce días (el libro de la guarnición, el alcaide). El **arzobispo** encuentra el ara
  DEO IGNOTO, dice que es un regalo que les protegerá, baja una y otra vez con sus canónigos y, la **noche de la
  caída**, abre la puerta: la campana de la Sé toca sola y los sitiadores abren las puertas de la ciudad «como si
  alguien los llamara». Dom Paio y Dom Mendo arrancan la Garra de la cerradura y la puerta se cierra con el arzobispo
  dentro, cantando: «mientras él siga cantando ahí dentro, la ciudad no despierta».
- **El protagonista** es el preso de la primera celda del castillo, «el que no se arrodilló». El carcelero le dejó
  sin comer y no quiso abrirle; en su celda alguien arañó una y otra vez NO TE ARRODILLES, y su reja está reventada
  hacia fuera. El arzobispo «hablaba de él»: le deja su anillo y le pide que termine «lo que él no supo terminar». En
  el código se llama **el Condenado**: caballero de la guarnición, cota de malla, sobreveste carmesí, yelmo nasal.
- **Despierta la tercera noche después de la caída.** Quiere salir, y la única salida es la galería del río, detrás
  de la cisterna: hay que pasar por la puerta del dios y por el arzobispo, que se hace gigante. Al amanecer, el río;
  las campanas callan; «nadie volvió a entrar en la ciudad».
- **La regla**, en el ara del templo romano: «Lo que se ofrece a la oscuridad, la oscuridad lo devuelve
  multiplicado».

Lo que funciona y se queda: los documentos breves (la historia la cuenta el escenario), los cuatro cerrojos, la gente
de la ciudad (Henrique y Leonor, Miguel y Joana, el canónigo y el ama, el alcaide, Paio y Mendo) y los motivos que ya
se repiten solos: arrodillarse, taparse la cara, multiplicar, la campana, las tres noches.

## 2. Lo que no encaja

| # | Dónde | Qué pasa | Arreglo (vale para cualquier plan) |
|---|---|---|---|
| 1 | Nota del carcelero (`story.js`, `carcelero`) | «Tercera noche del asedio» se confunde con la tercera noche después de la caída, la del juego; y, con un asedio de catorce días, deja al arzobispo once días bajo tierra y al preso dos semanas sin comer. | «Duodécima noche del asedio». Lo demás se queda: «Sólo subieron ellos dos» son los dos canónigos que volvieron sin él (uno, el de la casa del canónigo: «No volveré a bajar»). |
| 2 | Inscripción de los mártires (`martires`) | Bajó «con su anillo», pero el anillo lo dejó en su sepulcro antes de bajar (la nota de la Garra, Paio). | «...solo, con su incensario y algo de oro envuelto en la estola» (la Garra). |
| 3 | Últimas palabras del arzobispo (`arzobispo`) | Habla del Turiferario como de otro («Arde por mí»), y el Turiferario es él, transfigurado. | «Bajo a la cisterna. Lo que te espere allí ya no seré yo: será su Turiferario, el que le quema el incienso.» |
| 4 | Dom Paio convertido (`entities/paio.js`) | Su título de jefe, «el Condenado», es el del protagonista (así le llama el arzobispo y así se llama en el código). | «Dom Paio, el Encadenado» (guarda la cadena de la pila). |
| 5 | Facón criollo y katana sagrada (`story.js`, `ITEMS`) | Un marinero del Río de la Plata y un jesuita del Japón, tres siglos y medio después de un juego que pasa hacia 1212 (el abuelo de Henrique vio caer Lisboa en 1147). Todavía no están en el mundo. | Rehacerlas sin tocar sus golpes (§3.6). |
| 6 | «Cisterna del Dios Desconocido» (`AREA_NAMES`) | Todo lo demás dice «Dios Ignoto». | «Cisterna del Dios Ignoto» (opcional). |
| 7 | Huecos | No se dice por qué está preso ni ante qué no se arrodilló, por qué le teme el carcelero, quiénes eran los sitiadores ni qué fue de ellos, ni por qué se vuelve de la muerte. | Lo contesta cada plan (§4). |

Anacronismos menores que pueden quedarse, porque no rompen el tono: el pentáculo invertido (su sentido satánico es
del siglo XIX), la Dolorosa de los siete puñales (siglos XIV y XV), el escapulario del Carmen (finales del XIII) y
«Nós ossos que aqui estamos» (la capilla de los huesos de Évora, del XVI).

## 3. Lo que se fija ya, con cualquier plan

### 3.1 Cuándo

Hacia **1212** (en un documento fechado, «Era de MCCL»: la era hispánica que se usaba entonces). El asedio dura
catorce días; la caída es la decimocuarta noche, **la noche de la campana**. El juego entero es **la tercera noche
después**: empieza en la celda y acaba al amanecer junto al río. De ahí el título: *Amanecer en Braga*.

| Cuándo | Qué pasa | Dónde se cuenta |
|---|---|---|
| Antes de Roma | Los de los montes se arrodillan ante la fuente y le dan; la fuente lo devuelve multiplicado | el ara romana |
| *Bracara Augusta* | Roma le alza un templo sobre el agua sin saber a quién: DEO IGNOTO | el templo, la antesala, la cisterna |
| Siglo I | San Pedro de Rates predica en Braga y muere rezando | la losa del oratorio |
| Siglo VI | San Martín de Dumio: los cuatro cerrojos, su cripta encima, los Velados, el primer obispo que bajó | Martín, la Confesión, los Velados, el osario |
| Siglo XII | La Sé sobre la cripta de Martín | — |
| 1147 | Heinrich, de Solingen, ve caer Lisboa y se queda en Braga | la carta del abuelo |
| Día 1 | Llega la hueste; empieza el asedio | — |
| Días 3 a 6 | El arzobispo baja con sus canónigos, encuentra el ara: «un regalo» | el diario del canónigo |
| Día 7 | La rogativa (según el plan: §4) | **nuevo** |
| Días 8 a 13 | Lo que se dio vuelve multiplicado: la masa, las cotas, Inés, los heridos de la capilla; los de fuera dejan de gritar, cantan y muerden | el panadero, el herrero, Joana, Miguel, la guarnición |
| Noche 12 | El arzobispo baja otra vez con dos canónigos; suben ellos dos; él se queda abajo | el carcelero (arreglado), el canónigo |
| Día 14 | Clavan a Don Gonçalo en el Postigo; el alcaide se encierra en la torre y alza el puente | el alcaide, su orden |
| Noche 14: la noche de la campana | Deja el anillo y sus últimas palabras en su sepulcro, baja por los mártires con el incensario y la Garra y abre la puerta; la campana toca sola; los de fuera abren las puertas; Braga se arrodilla. Paio y Mendo bajan detrás, arrancan la Garra, la puerta se cierra con él dentro; Mendo muere en el relicario | los mártires (arreglado), el arzobispo, la Garra, Paio, la Confesión |
| Noches 1 a 3 | Leonor baja a la gruta; Miguel; el canónigo en su bodega; el ama huye; Paio, con el santo | Henrique, Leonor, Miguel, el ama |
| Tercera noche | El preso despierta. Al amanecer, el río | la intro, el final |

### 3.2 El dios

- Es el dios de **una fuente de antes de Roma**: la de los brácaros, los de los montes. Su fuente es la cisterna de
  la cúpula; su **ídolo**, el de la mano de oro (la Garra). Roma le alzó un templo sin saber a quién: DEO IGNOTO.
  *Anclaje real*: la **Fonte do Ídolo** de Braga, un santuario de época romana tallado en la roca junto a un
  manantial y dedicado a un dios indígena, **Tongoenabiago** (en su nombre se ha querido ver el de Nabia, diosa de
  las aguas, y se ha propuesto que *tongo-* sea «juramento», como el irlandés antiguo *tongu*, «juro»). Y Martín de
  Dumio, en su sermón contra las costumbres de los campesinos (*De correctione rusticorum*), condena, entre otras
  cosas, encender velas junto a las fuentes y echar pan en ellas.
- **La regla** (ya está escrita: el ara romana y el libro del rito, «el dios no oye: huele»): **no oye lo que se le
  pide; huele lo que se le da, y lo devuelve multiplicado.** Nadie recibe lo que quería, sino lo que dio:

  | Quién | Qué le dio | Qué le devolvió |
  |---|---|---|
  | El arzobispo | la ciudad («le di la ciudad para salvarla») | la ciudad entera, hecha carne |
  | El canónigo | sus rodillas («no me arrodillaba lo bastante») | rezar cada vez más abajo, con los huesos fuera de su sitio |
  | Leonor | su pena (siete noches, siete velas) | la Dolorosa |
  | El panadero | la masa | «La masa no sube. Crece.» |
  | La tejedora | el hilo de las mortajas | una tela que pide más |
  | Don Gonçalo | su puerta, que aguantó | seguir en pie con el asta dentro, y lo que le crece debajo |
  | El campanero | la campana | la campana, por cabeza |

  Es también la regla para las criaturas nuevas: **cada una es lo que dio, multiplicado.**
- **Para darle algo hay que arrodillarse**, y arrodillarse es entregarse: al que se arrodilla le llama por su nombre
  («sabe mi nombre, el de pila»). **El que no se arrodilla no le debe nada.**
- **Nunca se le ve entero.** Canta, llama, se arrastra en el humo. Nadie sabe su nombre; él sabe el de todos.
- Martín no lo rompió porque no lo conocía: «no se rompe lo que no se conoce». Por eso le echó cuatro cerrojos: la
  **mano**, la **sangre**, el **humo** y los **ojos** (los Velados, que no quisieron verle).

### 3.3 Por qué el arzobispo

Era un hombre de letras, y el ara decía lo mismo que San Pablo encontró en Atenas: *Ignoto Deo*, «al dios
desconocido»; «lo que adoráis sin conocerlo, eso os anuncio yo» (Hechos 17, 23). Creyó que bajo su catedral esperaba
el Dios verdadero, de antes de Cristo, y que se lo mandaba para salvar Braga. Basta una línea en el diario del
canónigo: «Dijo que San Pablo ya lo había anunciado en Atenas».

### 3.4 Los sitiadores

Recomendación: **una hueste cristiana, rival y sin nombre en el juego** («los de fuera», «la hueste»). Esos años hubo
guerra entre León y Portugal, y no hace falta decir más. Oyeron el canto desde su campamento: dejaron de gritar y se
pusieron a cantar; mordían (Miguel); la noche de la campana abrieron las puertas y entraron a arrodillarse con los
demás. Su campamento, vacío y con las hogueras encendidas, se ve desde las murallas. (Otras opciones, en las
preguntas.)

### 3.5 Las reglas de escritura

- **Arrodillarse** es entregarse; **estar de pie**, no deber nada.
- **Ver y no ver**: los Velados y el primer obispo no quisieron verle; los suyos se tapan la cara («los suyos no
  traen la cara descubierta»); el protagonista va con la cara descubierta: es el que mira.
- **Multiplicar**: lo que se da vuelve multiplicado.
- **El nombre**: él sabe el tuyo; nadie sabe el suyo.
- **La campana, el humo, la sangre, la mano y las tres noches.**
- **Breve**: cada documento cuenta un trozo y nadie lo explica todo; el dios nunca habla claro.

### 3.6 Las armas que no son de su tiempo

Mismos golpes, otro objeto (y el mismo `id` en el código):

- **Facón criollo → Misericordia**: el puñal estrecho que los caballeros llevaban al cinto para rematar al caído por
  las juntas de la armadura. Corto y veloz, tajos que se encadenan y una puñalada que remata: lo que ya hace. (O la
  **faca de los Pellejeros**, el cuchillo de desollar de las curtidurías.)
- **Katana sagrada → Falcata de la fuente**: la espada curva de los íberos, que alguien echó a la fuente como ofrenda
  hace dos mil años y que salió del fondo con las demás; los canónigos la bendijeron para quitarle lo que tuviera de
  su dios. Se desenvaina y corta en un solo gesto, y su acero **reluce en la oscuridad**: cerca de la fuente, más. (O
  un **alfanje** ganado en las guerras del sur y bendecido en la Sé.)
- El hacha del Gerês y la lanza de la muralla ya son de su tiempo.

### 3.7 Cómo se dice

- **La noche de la campana**: la de la caída.
- **El Pacto**: lo que se jura de rodillas. Su **sigilo** es el sello del anillo del arzobispo (el palio en Y dentro
  del anillo de doce marcas, con sus tres puntos), y se pintó en las puertas de los que se arrodillaron.
- **Él** (con mayúscula, en boca de los suyos), **DEO IGNOTO**, **el Dios Ignoto** (en los rótulos). Nunca su nombre.
- **El Condenado**: sólo el protagonista.

## 4. Tres planes

Los tres comparten todo lo anterior. Cambian quién es el protagonista, por qué está preso, por qué vuelve de la
muerte y qué significa el final.

### Plan A · El Pacto (recomendado)

**El protagonista es el único que no se le entregó.** En mitad del asedio, el arzobispo convocó **la rogativa**:
Braga entera de rodillas en la plaza de la Sé, ante el humo negro del incensario. Todos bajaron la cabeza; un
caballero de la guarnición miró el humo, vio lo que había dentro y se quedó de pie. El arzobispo le condenó por negar
la rodilla a Dios a la vista del pueblo y le entregó al alcaide, que le encerró en la primera celda.

- **Por qué sigue siendo él**: no se arrodilló, no le dio nada; el dios no le llama. Pasó las noches de la celda
  oyendo cantar a los de fuera y rezar a los de dentro, y arañando NO TE ARRODILLES para no ceder.
- **El carcelero** le tiene miedo como a un hereje: el arzobispo le condenó delante de todos.
- **La reja** la reventó él la noche de la campana, medio muerto de hambre; no lo recuerda.
- **Volver de la muerte**: los altares de los santos (Martín, Bárbara, Fructuoso) no le cierran la puerta («San
  Martín no le cierra la puerta a nadie»). Las criaturas, en cambio, son de Él, y vuelven a sus puestos.
- **El arzobispo**, al final, se arrepiente: le deja el anillo para que acabe con él.
- **El final normal**: muerto el cuerpo del dios (el arzobispo), calla el canto y el dios vuelve a dormir bajo su
  cisterna. **El verdadero** (§6): matarle.
- **Lo que cambia**: los arreglos del §2, la línea de San Pablo en el diario del canónigo y tres documentos nuevos:
  el **pregón de la rogativa**, clavado en una puerta de la Calle de la Catedral («...que todo vecino de Braga venga
  a la plaza a arrodillarse ante el regalo que Dios nos hace bajo su casa. Las casas que se arrodillen llevarán su
  sello en la puerta»); la **sentencia**, en el cuarto del carcelero, y una **copia del sermón de Martín**, en su
  capilla (el pan que se echa a las fuentes).

A favor: es lo más fiel a lo que ya está escrito (cada línea sobre arrodillarse encaja sola); se cuenta en una sola
imagen, una plaza entera de rodillas y uno de pie, y deja al protagonista en blanco, como en los *Souls*. En contra:
no hay giro.

### Plan B · La Llave

**El arzobispo no le condenó: le guardó.** La puerta de Martín sólo queda abierta si la abre uno que no sea suyo: lo
que abre uno de los suyos vuelve a cerrarse (por eso Paio y Mendo pudieron cerrarla). El arzobispo lo sabía, y en la
rogativa encontró lo que buscaba: el único que no se arrodilló. La sentencia manda tenerle a oscuras y sin comer
«hasta que se le llame». Era la llave.

- **Volver de la muerte**: Él te devuelve. Te necesita.
- **La reja** la reventó Él.
- **El final**: los cuatro cerrojos los descorres tú, y lo que sale por la puerta es lo que se ve en la película. El
  final normal se lee de otra manera: las campanas callan porque ya no hace falta llamar a nadie. Sólo el final
  verdadero es una victoria.
- **Lo que cambia**: lo del plan A, más el carcelero («...como mandó el arzobispo»), una línea en el libro del rito
  («Lo que abre uno de los suyos se cierra. Ha de abrirla uno que no lo sea.») y el susurro de la intro: «Ábreme» en
  vez de «Arrodíllate».

A favor: el giro de los *Souls* (Frampt y Kaathe); el «no sé si eso es una gracia o una condena» de Paio cobra
sentido, y empuja hacia el final verdadero. En contra: el final normal sabe a derrota y, si las pistas no se siembran
bien, a trampa.

### Plan C · El Perjuro

**Juró, y no se arrodilló.** Era el caballero que la guarnición prestó al arzobispo para bajar a la cripta. Bajó con
él y con dos canónigos, y los cuatro juraron con la mano en el ara (el arzobispo creía jurar ante Dios). Al
«arrodillaos», él no lo hizo: rompió un juramento hecho ante un dios de juramentos.

- **El castigo** del arzobispo fue la celda; el del dios, **no poder morir** mientras no se arrodille. El carcelero
  le deja sin comer... y no se muere: por eso le teme.
- **Volver de la muerte**: la maldición del perjuro (la de los no muertos de *Dark Souls*): el dios no le suelta.
- **El final**: matar al gigante no le libra. Sólo el final verdadero, y entonces el amanecer junto al río es su
  última mañana.
- **Lo que cambia**: el carcelero («lleva nueve días sin comer y no se muere»), la sentencia (por perjurio), un
  documento con la fórmula del juramento, una línea de Paio («Tú bajabas con él. Te vi en la escalera de la cripta.»)
  y la intro (el juramento, además de la rogativa).

A favor: una culpa y un lazo con el arzobispo (su «si eres tú, condenado...» se vuelve personal), y la muerte y el
regreso tienen explicación. En contra: el protagonista deja de ser una página en blanco, y es el plan que más texto
pide.

### Descartado: el protagonista, uno de los sitiadores

Tenía su gracia (un enemigo que acaba cerrando la ciudad que le encerró), pero el modelo y el código le hacen
caballero de la guarnición, y habría que reescribir a Paio y al arzobispo.

### Comparación

| | A · El Pacto | B · La Llave | C · El Perjuro |
|---|---|---|---|
| Fiel a lo escrito | del todo | mucho | mucho |
| Textos que cambian / nuevos | 5 / 3 | 6 / 3 | 6 / 4 |
| Giro | ninguno | grande | mediano |
| Volver de la muerte | los santos | el dios | la maldición |
| El final normal | victoria: el dios duerme | ambiguo: tú le abriste | amargo: sigues maldito |
| El final verdadero | matar al dios | deshacer lo que abriste | poder morir |
| Riesgo | poco | que parezca una trampa | un protagonista con historia propia |

Se pueden mezclar: **A en la superficie y B escondido** (la sentencia del plan A con una línea ambigua y la del libro
del rito, para que el final verdadero lo revele).

## 5. La introducción

### 5.1 La idea

Como las de *Dark Souls* y *Elden Ring*: una voz que cuenta un mito, de lo más viejo a lo de ahora, sobre imágenes
que pasan despacio, y al final el protagonista en el sitio donde se empieza a jugar. Aquí, **tres maneras de verse
para tres tiempos**:

1. **El mito, en un retablo**: madera policromada y oro viejo, cuatro casas con figuras de bulto que se mueven a
   tirones, como títeres, y la luz de una vela que pasa. La fuente, Roma, Martín, la Sé.
2. **La memoria, en sombras**: la ciudad de ahora, de noche y con niebla, y en ella las siluetas negras de lo que
   pasó (como los fantasmas que ya se ven en la niebla), que al acabar su plano se deshacen en humo. Una sola figura
   con color: el caballero de la sobreveste carmesí.
3. **El presente, en carne**: lo que queda, visto a medias, y la celda.

Sin voz (el juego no tiene voces): **rótulos** en la franja negra de abajo, con la letra del pergamino del final, y
las palabras clave dentro de la imagen (DEO IGNOTO grabado en el ara, NO TE ARRODILLES arañado en la pared, el
título). Unos **dos minutos y medio**.

### 5.2 El guion (plan A)

| # | t | Plano | Rótulo | Sonido |
|---|---|---|---|---|
| 1 | 0:00 | Negro. Se enciende una vela: el pie del retablo, polvo, oro viejo. | — | Gotas. Un bordón grave. |
| 2 | 0:06 | **La fuente.** Monte de noche, robles, un manantial entre peñas y su ídolo, con una mano de oro. Gente de rodillas: uno echa un pan al agua; el agua se enciende y devuelve dos, cuatro, ocho. | «Antes que Roma, en los montes, había una fuente.» / «A quien se arrodillaba y le daba, se lo devolvía multiplicado.» | Agua. Un coro lejano, sin palabras. |
| 3 | 0:18 | **Roma.** Columnas y una cúpula sobre el agua; un cantero graba el ara; el humo del incienso baja hacia la fuente. | «Roma le alzó un templo. No sabía a quién rezaba, y escribió:» (y en el ara, DEO IGNOTO) | El cincel. |
| 4 | 0:28 | **Martín.** Un obispo con báculo y farol ante una puerta negra: corta la mano de oro, cierra tres compuertas; dos monjes se tapan la cara y se plantan delante; se echan cuatro cerrojos. | «Martín de Dumio bajó a la fuente y no la rompió: no se rompe lo que no se conoce.» / «Le echó cuatro cerrojos y, encima, levantó su iglesia.» | Cuatro golpes de hierro. |
| 5 | 0:42 | **La Sé.** En lo alto del retablo, la catedral crece sobre la iglesia de Martín; pasan el sol y la luna. La cámara entra en la casa pintada... | «Sobre ella se alzó la Sé, y Braga olvidó lo que dormía debajo.» | Campanas, lejos. |
| 6 | 0:50 | **El asedio.** ...y sale a la Sé de verdad, de noche. Desde la Torre del Fanal, el campamento y sus hogueras; un tiro de trabuco en llamas; en el adarve, sombras con escudos. | «Seiscientos años después, llegó el asedio.» | Los tambores del campamento. El trabuco. |
| 7 | 1:02 | **El regalo.** El templo romano de la cripta: la sombra del arzobispo, con su incensario, ante el ara; dos canónigos detrás. Se arrodilla. | «El arzobispo bajó a buscar a Dios bajo la cripta y halló un altar sin nombre.» / «Dijo que era un regalo.» | Las cadenas del incensario. |
| 8 | 1:14 | **La rogativa.** La plaza de la Sé: cientos de sombras de rodillas; el humo negro baja por el atrio. Cenital, despacio: entre todas, una figura de pie, la única con color. En el humo, un instante, una mano de cuatro dedos. | «Mandó que Braga entera se arrodillara.» / «Todos se arrodillaron. Todos menos uno.» | La letanía de la plaza (*Kyrie eleison*). Silencio de golpe. |
| 9 | 1:30 | **La condena.** Dos sombras se lo llevan; la reja de la primera celda se cierra (la de verdad). | «Al que no se arrodilló lo condenaron y lo encerraron bajo el castillo.» | La reja. |
| 10 | 1:36 | **La campana.** La campana de la torre este empieza a moverse sola. Fuera de la muralla, las sombras de la hueste se vuelven hacia la ciudad, sueltan las armas y cantan; la puerta se abre; entran despacio; en las calles, todas las sombras se arrodillan, y en las puertas aparece el sigilo. | «La decimocuarta noche, la campana de la Sé tocó sola.» / «Los de fuera abrieron nuestras puertas, como si alguien los llamara. Y Braga se arrodilló.» | La campana. Un canto en una lengua que no es de hombres. |
| 11 | 1:52 | **Lo que queda.** Tres planos, a medias: el Empalado de rodillas en lo alto del Postigo, a contraluz; la cuna de Tomé, que se mece sola en la gruta; dos ojos en la bóveda de una bodega. | «Lo que le dieron, Él se lo devolvió multiplicado.» | Un latido, un llanto, un crujido. |
| 12 | 2:04 | **La puerta.** Los Velados, de espaldas, ante la Puerta del Dios Ignoto; por debajo de la puerta, luz roja. | «Bajo la Sé, tras su puerta, el arzobispo no deja de cantar.» | El canto, apagado por la piedra. |
| 13 | 2:12 | **La celda.** Negro; susurros de muchas voces, cada vez más («Arrodíllate»). Una mano en la pared: las uñas rotas arañan, letra a letra, NO TE ARRODILLES. | — | Las uñas en la piedra. Un tañido. |
| 14 | 2:26 | El título: **Dawn of Braga**. | — | — |
| 15 | 2:32 | «Braga. Tercera noche después de la caída.» Y el despertar de siempre. | — | La música de la prisión. |

### 5.3 Con los otros planes

- **B**: en el 9, «Al que no se arrodilló lo encerraron a oscuras, sin comer. Lo guardaban para algo.»; en el 13, los
  susurros dicen «Ábreme», no «Arrodíllate».
- **C**: el 7 se rehace: el arzobispo baja con dos canónigos y un caballero; juran con la mano en el ara; tres se
  arrodillan y el caballero no; en el ara se abre un ojo. «El que jura ante Él y no se arrodilla no puede morir.» En
  el 9: «Lo encerraron bajo el castillo, sin comer. Y no se murió.» En el 13: «Arrodíllate. Me lo juraste.»
- **Sin destripes**: se quita el 11 (quedan dos minutos y cuarto).

### 5.4 Sonido

Todo por código, como el resto: un tema nuevo (`intro`) sobre el bordón de la pantalla de título; el coro sin
palabras del mito; los tambores del campamento (ya existen); la letanía de la plaza; la campana que toca sola
(`bellToll`); los susurros (la voz susurrada ya está sintetizada) y un sonido nuevo, las uñas en la piedra. Silencio
en el título; al despertar, la música de la prisión.

### 5.5 Cómo se hace

- **El director** (`src/game/intro/`): una corrutina sobre el armazón de la película del jefe final
  (`finale/film.js`: planos, travellings, franjas, cámara al hombro, saltar). Arranca en `newGame()` en lugar de
  `story(MSG.intro)` y acaba en `beginPlay(true)`, con la cámara del despertar que ya existe.
- **El retablo**: geometría nueva y sus figuras (el esqueleto humanoide, con clips sencillos: arrodillarse, ofrecer,
  grabar, cortar). Se construye al empezar la intro y se tira al acabar: no pesa en la carga ni en la partida. Si las
  figuras no convencen, tablas pintadas, planas, con capas que se desplazan.
- **Las sombras**: siluetas instanciadas (una multitud de cientos casi sin coste), de unas pocas poses horneadas (de
  rodillas, de pie, andando, cantando), con el material negro con niebla de los fantasmas (`buildPhantom`) y un
  fundido a humo.
- **Los sitios de verdad** ya están hechos: la plaza de la Sé, la Torre del Fanal y el campamento, la torre de la
  campana (la campana, como pieza aparte que se mueve), el templo romano, la Puerta del Dios Ignoto y la celda.
  Durante la memoria se esconden las criaturas de ahora; en el presente están en su sitio.
- **Los rótulos**: una capa sobre el lienzo, como el pergamino de `story()`.
- **Saltar**: manteniendo *interactuar* un segundo (que no se salte sin querer): fundido, el último rótulo y el
  despertar. Se ve al empezar una partida nueva y se puede volver a ver desde el título.
- **Pruebas**: `tools/intro.mjs` saca un fotograma de cada plano, mira los errores y comprueba que, vista o saltada,
  la partida empieza igual que ahora; `tools/progress.mjs` la salta. Y una instancia en el modo desarrollador.

### 5.6 Riesgos

- **Que dure**: dos minutos y medio es el tope, y cada rótulo, una frase.
- **Que no se lea**: los rótulos, siempre en la franja, nunca sobre la imagen.
- **Que destripe**: el plano 11 enseña poco y a medias (o se quita).
- **El retablo** es lo más caro de hacer bien; tiene una salida barata (las tablas pintadas).
- **Que contradiga el final**: la campana que toca sola abre el juego y las campanas que callan lo cierran.

## 6. Hacia el final verdadero

Lo que ya está escrito en `finale/director.js`: un **objeto verdadero**, forjado, al que se llega por varios PNJ, que
muestra el **Alma** de un ser y deja herirla para siempre; de momento, sólo con Deo Ignoto. Con este lore tiene su
sitio solo: **Martín no rompió al dios porque no le conocía. El objeto verdadero es conocerle: su nombre**, el que
los de los montes no decían y Roma no supo escribir.

- **Quién lo forja**: Henrique, cuchillero, nieto de un espadero de Solingen, con el acero de la espada que dice IN
  NOMINE DOMINI («en el nombre del Señor») y el Cerrojo de San Martín, el que no abre, sino que cierra.
- **Dónde está el nombre**, en tres trozos: la piedra más vieja de la fuente, detrás del ara romana (el nombre,
  picado a cincel); el sermón de Martín, que nombra a los demonios de las fuentes, y la memoria de **Joana, la
  herbolera**, la madre de Miguel, que se fue a buscarle a la muralla y de la que nadie sabe si vive («para el mal de
  ojo, ruda, y no contárselo a nadie»: lo que Martín quiso quitar sigue en las recetas de las viejas).
- **El nombre de verdad** puede ser el de la Fonte do Ídolo o uno inventado (pregunta 4).
- En el **plan C**, matar al dios es además lo único que deja morir al protagonista.

## 7. Preguntas

1. **¿Qué plan?** A (El Pacto), B (La Llave), C (El Perjuro), o A con B escondido. *Recomiendo A, dejando la puerta
   abierta a esconder B para el final verdadero.*
2. **¿Quiénes eran los sitiadores?** Una hueste cristiana sin nombre (*recomendado*); leoneses, con nombre y fecha;
   la gente de los montes que nunca dejó de adorar la fuente (el dios los llamó: el asedio mismo sería suyo); o los
   almohades (*desaconsejado*: en Braga, hacia 1212, no tiene sentido histórico, y hacer monstruos de un pueblo real
   no le hace falta al juego).
3. **¿Por qué se vuelve de la muerte?** Los santos (A), el dios (B), la maldición (C), o no se explica.
4. **¿El nombre del dios?** No se dice nunca; se dice en el final verdadero y es el de verdad (Tongoenabiago, el de
   la Fonte do Ídolo); o uno inventado.
5. **¿El facón y la katana?** Rehacerlos (*Misericordia* y *Falcata de la fuente*: *recomendado*), dejarlos como
   guiño o quitarlos.
6. **¿Cómo se ve la intro?** Retablo, sombras y carne (*recomendado*); todo en 3D, con personajes de verdad (lo más
   caro); o todo retablo (lo más barato).
7. **¿Se enseñan los jefes en la intro** (el plano 11, a medias)?
8. **¿Quién cuenta?** Un cronista sin nombre (*recomendado*), Dom Paio (se sabe al conocerle) o, en el plan B, el
   propio arzobispo.
9. **¿Dom Paio pasa a ser «el Encadenado»?**

## 8. Orden de trabajo (cuando esté decidido)

1. Los arreglos del §2 y los textos del plan elegido (documentos nuevos y retoques), con el README al día.
2. La intro en bruto: los planos con su cámara en el mundo de verdad, los rótulos y los tiempos (un animático).
3. Las sombras: la multitud, el arzobispo, la hueste y la campana que se mueve.
4. El retablo y sus figuras.
5. La celda: la mano y las letras.
6. El sonido y la música.
7. Pulido, pruebas (`tools/intro.mjs` y la progresión) y la versión jugable.
