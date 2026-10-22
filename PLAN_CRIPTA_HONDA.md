# La cripta honda: análisis y rediseño

Plan de diseño y de trabajo de la zona que hay bajo la cripta de la Sé, empezado el 20 de octubre de 2026.
Sustituye a la versión anterior (la Galería del Sello, las dos catacumbas en cuadrícula, el rellano y la
antesala de 30 × 28 m). **Hecho:** la planta, sus salas, Dom Paio y el Custodio están en el juego
(`world/level_crypt2.js`, `game/crypt.js`, `game/paio.js`, `entities/paio.js`, `entities/custodio.js`); lo
que cambió por el camino respecto a lo planeado está anotado en cada apartado. Lo que se decidió con el
autor:

- Se rehace **sólo la cripta honda**. La cripta de arriba (la sala de llegada, el osario, el templo romano y el
  sepulcro del arzobispo) se queda; sólo cambian sus bocas hacia abajo. La cisterna no se toca: la película
  del jefe final depende de ella.
- La única sala que funcionaba, y la estética a seguir, es **la antesala de los Velados**. Hay que hacerla un
  poco más grande y darle una entrada a su altura.
- La zona pasa a durar **unas dos veces** lo de antes: más salas, un segundo nivel de catacumbas y más
  encuentros.
- Un **jefe nuevo**: el Custodio de la Garra.
- Un **personaje**: Dom Paio, el canónigo superviviente.
- Y, sobre todo, **la disposición**: nada de «un túnel, dos salas al lado y otro túnel lateral». Tiene que
  sentirse como una cripta de verdad, con planos que tengan lógica.

## 1. Diagnóstico de la zona anterior

Lo que funcionaba:

- **La antesala.** Tres naves sobre columnas, arquerías, bóvedas de cañón con fajones, estatuas colosales
  veladas, estandartes, braseros, la escalinata con sus pretiles y el estrado con la puerta. Es la sala que
  marca el tono.
- **El rompecabezas de la puerta.** Cuatro cerrojos con sentido (los Velados, la Garra, la sangre de las
  tres pilas y el humo), contados por los documentos. Se conserva entero.
- **Las pilas y sus cadenas** y el incensario que se iza solo. (La emboscada de la Garra, sí, pero se queda
  corta para la última zona: la sustituye el Custodio.)

Lo que no:

- **La disposición.** Del osario se salía a un túnel lateral (la Galería del Sello: 87 m en línea recta y
  2,5 m de ancho) del que colgaban salas sueltas y más túneles. Se leía como una mazmorra generada, no como
  una cripta.
- **Los laberintos.** Dos cuadrículas de pasillos de 2,5 m, todos iguales, con techo plano y el mismo
  mampuesto: sin hitos, imposible orientarse o recordar el sitio.
- **La entrada a la antesala.** De un pasillo estrecho a un rellano bajo de techo plano y, por un hueco, a
  la sala: sin anticipación, sin vistas, sin umbral. La sala más importante se descubría de lado.
- **La antesala, justa para la pelea.** Entre la escalinata y la escalera del estrado quedaban 8 m de suelo.
- **Sin lógica constructiva.** Nada explicaba por qué cada sala estaba donde estaba ni de qué época era.
- **Para ser la última zona,** poco que descubrir y nadie con quien hablar.

## 2. Qué es la zona en el juego

La última zona antes del jefe final. Se baja con la ciudad hecha (la manivela del alcaide abre la reja de
la cripta) y se sale por la Puerta del Dios Ignoto, que pide los cuatro cerrojos; tras ella espera el
arzobispo y empieza la película. Por eso tiene que ser la más honda, la más grande y la que mejor cuente la
historia: aquí San Martín de Dumio cerró al dios y aquí el arzobispo le abrió.

## 3. El concepto: un sitio con historia

Bajo la Sé hay tres épocas, cada una más honda que la anterior, y cada una construye a su manera:

1. **Bracara Augusta (romana).** El santuario del dios sin nombre: el manantial (la cisterna, con su corro de
   columnas y su cúpula) y, delante, su **basílica** (la antesala): sillería, tres naves, bóvedas de cañón,
   estatuas colosales. El templo romano de la cripta de arriba era su cara pública.
2. **San Martín de Dumio (sueva, siglo VI).** Martín encontró la puerta y no la rompió: la cerró con cuatro
   cerrojos y, pegada a la basílica pagana, levantó **su propia cripta-iglesia** para velarla, con arcos de
   herradura y el altar al norte. Los cristianos quisieron enterrarse junto al santo: la **sala de los
   obispos**, las **catacumbas** y la **cripta de los mártires**.
3. **La Sé (románica, siglo XII).** La cripta de siempre baja hasta lo viejo; el templo romano que conservó
   es la puerta de lo de abajo.

Reglas del diseño:

- **Salas, no pasillos.** Espacios de columnas y bóvedas (el lenguaje de la antesala) unidos por arcos en
  muros gruesos, escaleras y umbrales. Los únicos pasillos son galerías de catacumba: cortas, con nichos a
  los lados, que llevan a cubículos y salas.
- **Todo orientado como la catedral de arriba:** los altares, al norte.
- **Cada sala tiene una función y una época** que se leen en su planta, sus arcos y sus materiales.
- **Se baja:** -7 (la Sé), -8,2 (San Martín, la sala de los obispos y los mártires), -10,6 (las
  catacumbas y la pila de los mártires), -12,7 (los Inocentes), -13 (la antesala; su estrado, a -10, como
  la cisterna) y -16 (el pozo).
- **Hitos que se ven desde lejos:** la luz roja de la antesala por las ventanas de la sala de los obispos, la
  capilla de San Martín al fondo de su nave, el rayo del lucernario, el arzobispo rezando tras la reja.

## 4. La planta

```
 N                                                      río
 ↑                                                       │ (galería del río)
        ┌──────────┐ ┌──────────────┐                     │
        │ capilla  │ │ POZO DE LOS  │                ┌────┴──────┐
        │S. MARTÍN │ │  CONDENADOS  │                │           │   ┌───────────┐
        ├──────────┤ │     -16      │                │           │   │   PILA    │
 ┌─────┐│          │ └──────┬───────┘                │           │   │    DE     │
 │osa- ││ CRIPTA   │ ┌──┬───┴────────────────┬─────┐ │ CISTERNA  │   │ LOS MÁR-  │
 │rio  ▒▒  DE SAN  │ │t │                     │estr.│ │           │   │  TIRES    │
 └─────┘│ MARTÍN   ▒▒▒r │══▶  ANTESALA  ◀═══ │ -10 ▓▓ arzobispo │   └─────┬─────┘
        │  -8,2    │ │a │      -13            │Vela-│ │           │   ┌─────┴─────┐
        │ (nave y  │ │z.│                     │ dos │ │           │   │           │
        │  naves   │ └──┴───▫─────▫─────▫─────┴─────┘ └─────▫─────┘   │ MARTYRIUM │
        │laterales)│ ┌────────────────────────────┐   confesión      ▒▒           │
        │          ▒▒▒   SALA DE LOS OBISPOS      │┌──────┐┌──┐┌────┐ │   -8,2    │
        │          │ │   -8,2 (bosque de columnas,▒▒templo││os││sep.▒▒           │
        └────┬─────┘ │    bóvedas de arista)      │└──────┘│ar││    │ └─────┬─────┘
           atajo     └─────────────┬──────────────┘        │io││    │ ┌─────┴─────┐
 ┌───────────┴───┐ ┌───────────────┴──────────────────┐ ┌──┴──┴┴──┐ │ sacristía │
 │  INOCENTES    │ │    CATACUMBAS DE LA SÉ -10,6     ├─┤ llegada │ └───────────┘
 │    -12,7      ├─┤  (lucernario y oratorio)         │a│ (altar) │
 │ [RELICARIO]   │ └──────────────────────────────────┘ └─────────┘
 └───────────────┘
   ▒ arco o puerta   ▓ la Puerta del Dios Ignoto   ▫ ventana enrejada   a: atajo   ══▶ escalera
```

### Los espacios

| | Espacio | Nivel | Qué es | Qué hay |
|---|---|---|---|---|
| 1 | **La Confesión** | -7 | Al fondo del osario: la cámara de San Martín ante el manantial, con su *fenestella* (ventana enrejada) en el muro de la cisterna. | Por la reja se ve al arzobispo rezando ante la masa de carne. El sello del santo, un reclinatorio, velas. Sin salida. |
| 2 | **Sala de los Obispos** | -8,2 | Se entra desde el templo romano, por una tribuna con escalones: un bosque de columnas bajas con bóvedas de arista. Los sepulcros de los obispos de Braga entre las columnas. | Tres ventanas enrejadas al norte dan a lo alto de la antesala (la luz roja, los Velados al fondo). La inscripción de las pilas. Bajada a las catacumbas al sur; arcos a la cripta de San Martín al oeste. |
| 3 | **Cripta de San Martín** | -8,2 | La cripta-iglesia del santo: nave y dos naves laterales con arquerías de herradura y bóvedas de cañón; el altar al norte. | **Capilla de San Martín** (altar de descanso, la lápida, **Dom Paio**). El **Pórtico de los Velados** en el muro este, en el eje de la antesala. Un **osario** lateral. Al sur, la puerta del atajo de los Inocentes. |
| 4 | **Antesala del Dios Ignoto** | -8,2 / -13 / -10 | La basílica romana, más larga (46 × 30 m) y con el doble de suelo para la pelea. | Se entra por el pórtico a una **tribuna** que domina toda la sala: desde ahí se ve el eje entero, hasta la puerta (una avenida de braseros lleva la vista). Escalinata, nave con columnas y estatuas, estrado, los Velados, el incensario, la puerta. Sin niebla: al pisar la nave despiertan los Velados y a la espalda sube una reja del borde de la tribuna (la niebla tapaba la vista desde la tribuna). |
| 5 | **Pozo de los Condenados** | -16 | Bajo el lado norte de la antesala, «donde ya no se sube»: bóvedas de arista sobre dos pilares, tras la reja que abren los Velados al caer. | La Pila de los Condenados y su cadena, jaulas, quemados, cuatro braseros. **Dom Paio, convertido**, la guarda (un jefe; sin más criaturas). |
| 6 | **Catacumbas de la Sé** | -10,6 | La necrópolis de los canónigos: galerías cortas con nichos en tres alturas, cubículos con su arcosolio y un cruce de huesos. | El **lucernario**, con su pozo de luz y el **oratorio de San Pedro de Rates** (altar de descanso). Atajo a la sala de llegada: un lienzo de su muro que se hunde con la palanca de lo alto de la escalera (desde la sala no se nota). |
| 7 | **Catacumba de los Inocentes** | -12,7 | El nivel de abajo: nichos pequeños, de niños. | La **Pila de los Inocentes**. El **Relicario de San Martín**: la arena del **Custodio de la Garra** (y ante su boca, Dom Mendo, muerto, con la nota de la Garra). Escalera de atajo a la cripta de San Martín. |
| 8 | **Cripta de los Mártires** | -8,2 / -10,6 | Se entra por una puerta nueva en el sepulcro del arzobispo (en su eje): su paso privado, que baja. Un *martyrium* de tres naves con bóvedas de arista y los arcosolios de los mártires; frente a la puerta, su altar. | Al norte, bajando, la **Pila de los Mártires** entre cuatro columnas. Al sur, la **Sacristía del arzobispo**, abovedada (la cierra una losa con el sigilo del Pacto, que se hunde con su anillo): el incienso negro. |

## 5. El recorrido

**El camino principal.** Osario → templo romano → tribuna de la Sala de los Obispos (la primera vista: el
bosque de columnas, la luz roja que se cuela por las rejas del norte) → entre los sepulcros hacia el oeste →
cripta de San Martín: al fondo de la nave, la capilla encendida (descanso y Dom Paio) → el pórtico, en el
eje → la tribuna: la antesala entera a los pies, la puerta roja al fondo → la escalinata → los Velados.

**La entrada a la antesala** se construye en tres tiempos: se ve (por las rejas de la sala de los obispos,
desde arriba, sin poder entrar), se anuncia (el pórtico con la inscripción de los Velados y dos estatuas
colosales) y se revela (la tribuna, en su eje, con la sala entera delante y la escalinata bajando hacia
ella). Nunca un pasillo.

**Las ramas** (en cualquier orden):

- **Los Inocentes:** sala de los obispos → catacumbas de la Sé (lucernario) → escalera al nivel de abajo →
  la pila → el relicario y el Custodio. Al volver, el atajo sube a la cripta de San Martín.
- **Los Mártires:** el sepulcro del arzobispo (su anillo) → el martyrium → la pila, abajo → la sacristía y el
  incienso.
- **Los Condenados:** sólo tras los Velados, desde la antesala.

**Atajos y vueltas.** El paso escondido del muro oeste de la sala de llegada se abre desde las catacumbas (un
lienzo del muro que se hunde en el suelo con su palanca); el rastrillo del sur de la cripta de San Martín, desde
los Inocentes (lo sube una palanca de la escalera, que se ve entre los barrotes). Así se forma un anillo: cripta de
arriba → sala de los obispos → cripta de San Martín → Inocentes → catacumbas → sala de llegada. (Bajo tierra no hay
puertas de madera atrancadas: eran tablas y trancas a doce metros de profundidad.)

**Descansos.** El Altar de la Cripta (el de siempre), la Capilla de San Martín (a unos 40 m de la niebla de
los Velados) y el Oratorio de San Pedro de Rates (en el lucernario, a medio camino del Custodio).

## 6. Encuentros

Más criaturas que antes, repartidas con intención (no una de cada en cada sitio):

- **Sala de los Obispos:** penitentes rezando ante los sepulcros, un soldado cosido de ronda, una plañidera y
  un rastrero en las bóvedas.
- **Cripta de San Martín:** casi en calma (es el refugio): un soldado y una plañidera en el osario.
- **Catacumbas de la Sé:** mastines comiendo, rastreros en las bóvedas, un Campanero en el cruce de los
  huesos, un penitente y un soldado.
- **Inocentes:** plañideras (es una catacumba de niños) y un rastrero. **Relicario:** el Custodio.
- **Mártires:** penitentes, un soldado, un Campanero junto a la pila, un rastrero y una plañidera en la
  sacristía.
- **Antesala:** los Velados. **Pozo:** Dom Paio, convertido, solo.

## 7. Dom Paio, el canónigo superviviente

Uno de los dos canónigos que bajaron tras el arzobispo y volvieron a echar los cerrojos que pudieron. El
otro, **Dom Mendo**, se quedó con la Garra pegada a las manos (quemaba) hasta dejarla en el relicario, y allí
murió, ante el rastrillo: la nota de la Garra es suya. Paio se ha refugiado en la capilla de San Martín, de
rodillas a los pies del sepulcro del santo, con una vela (`game/paio.js`, `entities/paio.js`).

- **Al encontrarle:** reza en latín, de espaldas a la nave; al verte se levanta de un salto («¡Atrás, en
  nombre de San Martín!»). Al hablarle, te cuenta lo que pasó (el arzobispo, Mendo y la Garra) y reconoce al
  preso que no se arrodilló: «si de verdad vas a abrir esa puerta, que sea para hacerle callar».
- **Cada vez que vuelves:** lo siguiente que le falta a la puerta, de lo que no lleves hecho (la Garra, las
  pilas de los Inocentes y de los Mártires, el incienso, los Velados).
- **Tras los Velados:** ya no está. En la capilla queda su breviario: el dios le llama por su nombre y baja
  al pozo a guardar la cadena de los Condenados («que no corra»).
- **En el pozo:** le encuentras convertido, de rodillas ante la cadena, con el cirial de hierro de la
  capilla (la vela de la punta sigue ardiendo). Es un jefe, **Dom Paio, el Condenado**: mazazo, barrido,
  estocada y cera ardiendo; a media vida, la letanía de fuego (clava el cirial y la vela revienta en llamas
  alrededor). Hasta que cae, la cadena no se echa. Muere diciendo: «...Mendo. Ya no quema.»

## 8. El Custodio de la Garra (jefe nuevo)

«Los muertos de esta cámara la guardan mejor que nosotros», dejó escrito Dom Mendo. Al entrar en el
relicario, los huesos de los nichos y de los muros se juntan en el montón que hay detrás del altar del arca:
de él sale un coloso de calaveras y fémures (el tronco, de unos cuatro metros, con algo rojo que late en el
costillar y una corona de calaveras pequeñas). Cae el rastrillo de la entrada (`entities/custodio.js`).

- **Golpes:** un barrido con cada brazo, el mazazo con los dos (onda), la lluvia de calaveras (se arranca
  puñados del pecho y los lanza, una mano y otra) y el agarrón (se lanza con la mano abierta: no se para ni
  se desvía).
- **Lo suyo:** se deshace en su montón y se rehace en otro sitio de la sala, a unos seis metros de ti (los
  huesos corren por el suelo; mientras, no se le puede tocar): cada tanto, o si le pegas mucho seguido. A
  media vida se sacude, se le cae el antebrazo izquierdo, se acelera y se rehace más a menudo.
- **Al caer:** se desploma en su montón, el rastrillo sube, el arca se abre y la Garra queda a la vista.
- Su música: un xilófono de huesos en compás de 5, tambores secos y sonajas, y el coro de los monjes en tono
  de salmo. Sustituye a la emboscada de antes.

## 9. Los cuatro cerrojos, ahora

1. **Los Velados:** en la antesala.
2. **La Garra:** en el relicario de los Inocentes, tras el Custodio.
3. **La sangre:** la Pila de los Inocentes (abajo, en su catacumba), la de los Mártires (en su cripta) y la de
   los Condenados (en el pozo, tras los Velados y Dom Paio).
4. **El humo:** el incienso negro, en la sacristía del arzobispo (su anillo, en su sepulcro).

La puerta, su cerradura, los círculos de sangre, las lágrimas del dintel y el incensario siguen como estaban.

## 10. Lo que no se toca

- La cisterna y la galería del río (la película del jefe final), salvo la reja de la confesión.
- La cripta de arriba, salvo sus bocas: el osario da a la confesión, el templo a la Sala de los Obispos, la
  sala de llegada a las catacumbas (atajo) y el sepulcro a la cripta de los mártires.
- La Puerta del Dios Ignoto y su lógica (`game/crypt.js`): mismas coordenadas, el mismo estrado.

## 11. Plan de trabajo (hecho)

1. **Arquitectura.** Nueva planta en `world/level_crypt2.js` (`LAYOUT`: cada sala, su suelo, su arranque y sus
   opciones; de ella salen los muros, la altura del suelo para la navegación, las zonas y el mapa). Piezas
   nuevas en `world/builders.js`: bóvedas de arista con sus nervios y lunetos (`groinVaults`), rampas de
   bóveda en los dos ejes y arcos de herradura con sus enjutas; ventanas enrejadas; cada espacio con su luz,
   sus muebles y su suelo.
2. **El juego.** Pilas, notas, altares, atajos, criaturas; `game/crypt.js` con las posiciones nuevas, la
   reja de los Velados y la reja y el arca del relicario.
3. **Dom Paio** (vivo y convertido): `entities/paio.js` y su guion, `game/paio.js`.
4. **El Custodio de la Garra:** `entities/custodio.js`, con su música (`bossBones`) y su voz.
5. **Comprobaciones.** `tools/progress.mjs` de punta a punta (con Dom Paio, el Custodio y los Velados);
   `tools/cryptwalk.mjs` recorre a pie la cripta honda (qué salas se alcanzan con las puertas de partida y
   con todas abiertas, y dónde no se ve suelo); parpadeos (`zfight.mjs`); cámara (`camclip.mjs`, con
   puntos en todas las salas nuevas); capturas de cada sala; instancias del modo de pruebas para las tres
   peleas (el Custodio, los Velados y Dom Paio en el pozo); el README, al día.

## 12. Segunda vuelta (22 de octubre de 2026)

Lo que pidió el autor después de jugarla, y cómo quedó:

- **El templo romano** (lo peor de la zona: columnas sueltas con trozos de arquitrabe colgando en el aire, un
  techo plano de casetones, un charco de siete metros que parecía agua en el suelo y la puerta del panteón al
  fondo de un pasadizo torcido) se rehace como **basílica de tres naves**, como la de Porta Maggiore: dos
  arquerías de cuatro arcos sobre pilares, bóvedas de cañón estucadas desde el mismo arranque, el mosaico sólo
  en la nave del medio y, al norte, el **ábside** con su bóveda de cuarto de esfera (la misma curva de la nave,
  que sigue por él), el altar DEO IGNOTO con el relicario y dos braseros. Sus dos puertas dan al tramo del cruce:
  la del osario y, enfrente, la del paso del panteón, en el eje de su corredor (`TEMPLO`, en
  `world/level_sacred.js`).
- **El sepulcro del arzobispo**, reordenado: su sepulcro estaba en medio de la sala, en el paso de una puerta a
  la otra, con un muerto cualquiera dentro. Ahora el tramo de las puertas queda libre; al norte, en un estrado
  entre cuatro candeleros y bajo sus estandartes y su cruz, el sepulcro abierto y vacío, con el anillo en el
  borde y sus últimas palabras a los pies; al sur, en fila, los sepulcros de su cabildo.
- **El paso del panteón al templo**: recto, en el eje de la rotonda, bajo una sola bóveda de medio punto que
  arranca donde acaba el trasdós del arco de la salida, con seis peldaños de veinte centímetros y el rellano
  hasta la puerta del templo (antes: una bóveda rebajada más baja que el arco por el que se entraba, cuatro
  peldaños de treinta y un pasadizo más estrecho, torcido y con otra bóveda). `PASO`, en `world/panteon.js`.
- **La bajada a las catacumbas**: el umbral, con la misma sección que el arco de la salida, y doce peldaños
  bajo una bóveda en rampa que baja con ellos hasta la de la galería (la misma sección: la sigue sin escalón).
  Antes, la rampa era más baja que el arco y un lienzo tapaba el hueco entre los dos. `BAJADA`, en
  `world/panteon.js`.
- **Las galerías de las catacumbas**: bóvedas de medio punto más altas (arranque a 2,4 m), las cámaras donde se
  juntan, abovedadas (tenían techo plano, más bajo que las claves de las galerías: por eso se veían «paneles»
  según desde dónde) y, donde una galería da a una cámara, un arco de sillería con sus enjutas por las dos caras.
- **La sala de las calaveras** del cruce pasa a ser la **Capilla de los Huesos**, como la de Évora, con su lema
  (un documento más).
- **El inventario**, rehecho a lo Dark Souls (ver el README).
