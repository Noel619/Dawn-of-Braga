# Jefe final: la Película (Plan 2)

Plan de diseño y de trabajo del jefe final elegido el 9 de octubre de 2026, tras jugar la versión con
escalada (*Shadow of the Colossus*: guardada en `archive/jefe_final_trepar/`, con su plan).

La pelea deja de ser un coloso al que se trepa con control libre. Ahora es **una película**: cinemáticas
largas, coreografiadas, con pulsaciones rápidas (QTE) en los momentos de cuerpo a cuerpo, y entre medias
tramos jugables **guiados** (huidas por un recorrido fijo y dos espringalas en lo alto de dos torres). Nada
se trepa libremente; lo que antes era trepar ahora lo hace la cámara.

El arzobispo se transforma en cuanto se le vence en la cisterna: el suelo se hunde, lo que crece le sube
encima, la cúpula revienta, sale a la noche por fuera de la muralla norte, la atraviesa y se mete en la
catedral rompiéndola desde arriba; te agarra dentro de la nave, te alza sobre la ciudad y te lanza a
casi ciento cincuenta metros. Desde ahí, te caza por la ciudad, embistiendo y reventando manzanas enteras,
y se le vence con dos espringalas y dos momentos *God of War*. Al final se le arrastra a su agujero: la
cisterna.

**Deo Ignoto** pasa a ser un **jefe opcional** (ver «El futuro», al final): sólo aparecerá si se lleva el
**objeto verdadero**. Sin él, al hundirse el gigante se pasa directamente al final normal (el río al
amanecer).

## 1. El recorrido

```
            río
             │  (galería del río, desde la cisterna)
   ┌─────────●─────────┐  cráter: la cisterna reventada (de aquí sale y aquí vuelve)
   │    6    │         │
 ──┴──[T2]═══╪═════════┴──  muralla norte (brecha en x≈0; espringala 2 en la torre de x=-30)
             │ 1
         [cabecera]
         [  nave  ]  ←— 1 y 2: la nave revienta, te agarra, te lanza
         [fachada ]
           atrio            5: la cabalgada (de la puerta sur al norte, por el centro)
         Rúa da Sé
       Plaza del Pan ·····2·····> establo (corral de los Pellejeros): aterrizas
         Herrería    <··3··  corral, callejón del Muladar
       plaza de la puerta
   ════[T1]═══════════   muralla sur (espringala 1 en la torre oeste de la puerta)
```

Norte → sur → norte: la ciudad se rompe a lo largo de su eje (la catedral, la Herrería, la plaza, la Rúa
da Sé, el atrio) y todo acaba donde empezó, en la cisterna.

## 2. Los actos

Cada acto es una corrutina (como la huida de la Bestia): cada `yield` es un fotograma. La cámara es la del
guion (planos con su encuadre, travellings, cámara al hombro) salvo en los tramos jugables. Las franjas
negras marcan lo que es cinemática. En las cinemáticas, fallar una pulsación **duele pero no mata** (la
vida no baja de 1); en los tramos jugables se puede morir y se vuelve al último punto de control.
Las cinemáticas se pueden **saltar** con *interactuar* (se adelanta hasta el siguiente momento jugable;
las pulsaciones que se salten cuentan como acertadas).

### Acto 1 · La transformación (cisterna → muralla → nave), ~80 s

1. **De rodillas.** Último golpe: cámara lenta, el arzobispo cae de rodillas ante el altar del Dios
   Desconocido. Por encima del hombro del jugador. Jadea y se ríe.
2. **El incensario.** Lo alza; contrapicado de frente. La sangre del suelo hierve.
3. **La carne.** Plano abierto: la carne del dios brota entre las losas, le sube por el cuerpo y le
   envuelve; el capullo se hincha y late.
4. **El suelo se hunde.** El centro de la cisterna se parte en losas que se hunden en un pozo rojo; el
   capullo cae dentro. Silencio. Un latido.
5. **Lo que sube.** El suelo revienta hacia arriba: el lomo del gigante (la casulla, la cruz en Y, la
   joroba) sube del pozo y levanta las losas; la del jugador se inclina y resbala hacia el borde:
   **¡Agárrate!** (machacar). Fallo: resbala, se quema la mano en la carne, se agarra igual.
6. **El ascensor.** Sobre la losa encajada en su espalda, el jugador sube con él: las columnas caen hacia
   fuera, la cúpula se raja y revienta. Cámara desde arriba mirando al pozo que se aleja: vértigo.
7. **La noche.** Sale a la superficie fuera de la muralla norte (el cráter donde estaba la cúpula): tierra,
   losas y polvo. Se yergue (21 m), con el jugador aferrado a la casulla del hombro a dieciséis metros.
   Ruge a la ciudad; las campanas de la Sé tocan solas. Plano general desde el adarve.
8. **La muralla.** Tres zancadas y la atraviesa con el hombro: **¡Agárrate!** al golpe. Sillares por el
   aire.
9. **La nave.** Hinca las manos en el tejado de la cabecera y lo abre; la bóveda de cañón se parte por
   los fajones. El golpe suelta al jugador, que cae dentro: se agarra al estandarte grande del presbiterio,
   que se rasga y le baja hasta el suelo (cámara lenta).
10. **Se derrumba.** Tramo guiado (con control, recorrido de la nave hacia la puerta): caen tramos de la
    bóveda y las coronas de velas. **¡Esquiva!** (un fajón que cae) y **¡Rueda!** (una corona). La cara del
    gigante asoma por el agujero de la bóveda, enorme, mirándote. Su mano entra por arriba:
    **¡Esquiva!** (revienta los bancos). La segunda vez, te atrapa.

### Acto 2 · El agarrón y el lanzamiento, ~30 s

1. **La mano.** Los dedos se cierran como una jaula (cámara dentro de la mano). **¡Apuñala!** (machacar):
   le clavas la espada en un dedo, se estremece pero no suelta. Fallo: aprieta (daño).
2. **Arriba.** La mano sube por el agujero de la bóveda: la ciudad entera de noche, los fuegos, la niebla.
3. **La cara.** Primer plano: la jaula de hierro, los ojos de brasa, la mandíbula que se abre; te ruge a la
   cara (temblor, ascuas).
4. **El lanzamiento.** Echa el brazo atrás y te tira hacia el sur.
5. **El vuelo.** Cámara lenta: pasas por encima de las torres de la fachada, el atrio, la plaza; giro de
   cámara; el viento. **¡Cúbrete!** (guardia) antes del golpe.
6. **El tejado.** Atraviesas el tejado del establo del corral de los Pellejeros y caes en la paja.
   Fuera de franjas: control.

### Acto 3 · La Herrería (huida 1), ~45 s

Tramo guiado: del establo al corral, el callejón del Muladar, la Calle de la Herrería hacia el sur y la
plaza de la puerta. El gigante va detrás (lejos: es grande; cuando se acerca, ataca).

- Al salir del establo: ruge; vistazo atrás por encima de los tejados: salta desde la catedral.
- En el corral: cae sobre las casas del lado norte; cascotes y tejas: **¡Esquiva!**
- En la Herrería: embiste calle abajo, a cuatro patas, y las casas de los dos lados revientan en ola
  detrás de ti. Al llegar a la plaza de la puerta, descarga la campana donde estás: **¡Rueda!** La
  campana se queda clavada y un adoquín que sale despedido revienta la puerta atrancada de la torre oeste;
  corres hasta ella y subes por su husillo, a la sala de los guardas y por la escala a la trampilla del
  cadalso (antes había una escalera de madera de trece metros plantada en la plaza: ver
  `PLAN_TEJADOS.md`).

### Acto 4 · La primera espringala (torre oeste de la puerta sur), ~50 s

Tramo jugable: en lo alto, la espringala de la guarnición. **Cargar** (machacar el torno), **apuntar**
(cámara detrás del arma; el virote cae un poco) y **disparar**. Si tardas o fallas, la campana barre lo
alto de la torre. El gigante se tapa la cara con el brazo izquierdo: el virote se le clava en el
antebrazo, y la cadena queda tensa entre la torre y su brazo.

**Momento God of War 1:** tira de la cadena (la torre cruje) — **¡Corre!** — saltas del cadalso a la
cadena y corres por ella hasta su brazo; a medio camino adelanta el brazo, la cadena se afloja bajo tus
pies y restalla al tensarse: **¡Salta!** por encima del latigazo (si fallas, quedas colgado de ella y
trepas) — se sacude: **¡Agárrate!** — **¡Apuñala!** el dorso de la mano (la que te tiró):
se le abren los dedos, grita — estrella el brazo contra la torre para aplastarte: lo alto revienta, la
cadena se parte y tú quedas colgado del virote que lleva clavado.

### Acto 5 · La cabalgada, ~30 s

Cinemática con pulsaciones: enloquecido, echa a correr hacia el norte contigo colgado del virote de su
antebrazo. Revienta la plaza del pan, la Rúa da Sé (las manzanas del centro, en ola) y el atrio; cruza la
nave destripada y la brecha de la muralla.

- Sacude el brazo: **¡Agárrate!**
- Atraviesa la manzana del centro: **¡Agáchate!**
- Se lleva el brazo a la boca para arrancarte de un mordisco: **¡Apuñala!** (los labios: aparta el brazo).
- En la muralla, restriega el brazo contra el adarve para quitarte de encima: **¡Salta!** Caes en el
  adarve.

### Acto 6 · La segunda espringala y el final, ~80 s

Herido, va al cráter, se arrodilla en el borde y hunde la mano herida en la sangre que hierve: la carne se
le cierra (y escupe el virote). Tramo jugable: por el adarve hasta la torre de x=-30 (la del oeste de la
brecha: el brazo del virote es el izquierdo, y al correr hacia el norte queda al oeste), la escala de
dentro, la trampilla, lo alto. La espringala, en una tronera de la esquina del noreste. Le clavas el virote
en la nuca.

**Momento God of War 2:** se revuelve (la cadena de la nuca salta del ojo del virote: el virote se le
queda clavado) y embiste contra la torre, se agarra a las almenas con la derecha (la campana cae al cráter
tañendo) y su cara llega a lo alto, a dos metros: te ruge — **¡Salta!** a su cara — te agarras a la jaula
— **¡Apuñala!** el ojo, entre los barrotes.

**El corazón del dios** (`film_heart.js`). Los virotes no le matan: le derriban. Retrocede tambaleándose
hacia el cráter contigo en la cara — **¡Trepa!** por los barrotes y por encima del remate, a lo alto de
la cabeza, entre los cuernos — se revuelve como un perro mojado: **¡Agárrate!**; los cirios salen
volando y el último latigazo le arranca la aureola del cráneo (cae entera al campo) y las piedras de la
joroba — bajas por detrás de la cabeza a la joroba, lo más alto del cuerpo, con el virote clavado a un
palmo en la base del cuello: **¡Húndelo!** (machacar, con todo el cuerpo encima) — le atraviesa el
cuello: se ahoga sin voz, las piernas no le sostienen y cae de rodillas al borde del cráter, de espaldas a
él; el pecho se le abre como dos puertas y el núcleo late a la vista — la izquierda viene a la nuca a por
ti: **¡Salta!** por encima del hombro y de espaldas por la casulla abajo, hasta el nido del núcleo (no hay
suelo delante del corazón: te agarras a él, colgado, como de la jaula); la mano se cierra en el virote y
se lo arranca — junta las dos manos contra su pecho para aplastarte: **¡Esquiva!** (te descuelgas al
borde de abajo del hueco; las garras se le clavan a él) — **¡Apuñala!** el corazón (machacar: se arquea a
cada estocada, y el núcleo arde más) — la última, alzada a dos manos y hasta la empuñadura: revienta (la
luz, la onda, el silencio) y sales despedido. Se le apagan los ojos, los cirios y la carne que ardía;
muerto, se queda colgando de las rodillas y cae de espaldas al cráter: la sangre negra se lo traga y la
tierra del borde le cae encima. Amanece: tú, en el borde, a contraluz.

Y al final normal: el río al amanecer (la escena de siempre).

## 3. Puntos de control

| Bandera `film:cp` | Dónde se vuelve | El mundo |
|---|---|---|
| `rito` | el arzobispo de rodillas (la película desde el principio) | todo entero |
| `establo` | en la paja del establo | cráter, brecha norte, nave reventada, tejado del establo roto |
| `torreSur` | en lo alto de la torre oeste de la puerta sur | + la Herrería en ruinas |
| `muralla` | en el adarve norte, junto a la brecha | + la torre sur caída, el centro, la plaza y el atrio en ruinas |

Vencido: `boss:turiferario` (el gigante) y `boss:turibulario` (la de siempre: abre la reja del río). Si se
sale a mitad, al volver se empieza en el último punto de control con el mundo como estaba en él.

## 4. El gigante

### Modelo (detalle donde mira la cámara, y vestido de catedral)

El Turiferario de la versión 2 (21 m), con lo que se ve de cerca hecho de nuevo a más resolución:

- **Las manos** (la que te agarra y la de la campana): nudillos, pliegues, falanges, uñas de hueso, tendones
  y venas en el dorso, la palma con sus surcos. Se esculpen aparte, a una celda tres veces más fina, y la
  costura de la muñeca la tapan el **manípulo** (la banda litúrgica del antebrazo izquierdo) y la argolla
  de la cadena (el derecho).
- **La cabeza**: la cara de verdad tras la jaula (párpados, ojos de brasa, pómulos, labios rotos, dientes
  largos, la mandíbula desencajada), esculpida aparte; la costura del cuello, bajo el amito.
- **Vestido de catedral**: al reventar la nave se lleva la iglesia encima. Un fajón partido atravesado en
  la joroba, sillares y dovelas clavados en la carne de la espalda, una corona de velas enganchada en un
  cuerno de la mitra (encendida), el estandarte negro del presbiterio prendido en la aureola, vigas y
  tejas en la casulla. Piezas rígidas pegadas a sus huesos, con los materiales de la catedral.

### Animaciones nuevas

Salir del pozo con la espalda por delante; erguirse en el cráter; zancada; atravesar la muralla con el
hombro; abrir el tejado con las manos; asomarse por la bóveda; meter la mano y barrer; agarrar; alzar a la
cara; rugir de cerca; lanzar; el salto largo; la embestida a cuatro patas (galope sobre los nudillos);
frenar derrapando; el mazazo de la campana y arrancarla; taparse con el brazo (y recibir el virote); tirar
de la cadena; estrellar el brazo; correr con el brazo herido recogido; morder; restregar el brazo; beber
en el cráter; revolverse por el virote; agarrarse a la torre; el ojo; retroceder; caer de espaldas al
pozo; trepar por la cadena; hundirse. Todas con anticipación, golpe y recuperación, retrasos escalonados,
y la capa procedural de siempre (respiración, muelles de la ropa y de la cola, pies en el suelo).

### Del jugador

Resbalar y agarrarse a la losa; colgarse de la casulla; caer agarrado al estandarte; forcejear en la mano;
el vuelo (dando vueltas); caer en la paja; correr por la cadena; apuñalar a dos manos; colgarse del
virote; saltar a la cara; agarrarse a la jaula; manejar el torno; apuntar; cortar la cadena.

## 5. La espringala

Una ballesta de torre de la guarnición: bastidor de vigas, dos brazos metidos en madejas de cuerda
retorcida, la cuerda, el torno con su trinquete y las palancas, la cureña sobre un pivote para girarla y
una caja de virotes. El virote: un astil de casi dos metros con punta de hierro, unido por una cadena a
un bolardo de la torre. Se maneja así:

- **Cargar** (*interactuar* y machacar): el torno tensa la cuerda, el trinquete chasquea.
- **Apuntar**: cámara por detrás del arma; el ratón o el stick la giran (con límites); el virote cae un
  poco con la distancia. Si el tiro pasa cerca del gigante, él mismo se cruza en su camino (se tapa con el
  brazo, se revuelve): el virote acaba donde el guion lo necesita.
- **Disparar** (ataque): golpe seco, retroceso, la cadena se desenrolla silbando.

## 6. La ciudad que se rompe

Grupos nuevos del mundo, enteros y rotos (como el bloque del centro): la cúpula de la cisterna y el cráter;
la brecha de la muralla norte; la cabecera y la nave (la nave reventada ya existía); el tejado del
establo; las casas de la Herrería y del corral; lo alto de la torre oeste de la puerta sur; la plaza del
pan y el atrio (ya había ruinas del centro y tejados que se rompen); el cráter final. Cascotes con física,
polvo y fuego en cada derrumbe. Si mueres se vuelve al estado del punto de control.

## 7. Sonido y música

Silencio y el pavor al empezar; el *Dies irae* cuando ruge a la ciudad; la segunda fase en las huidas; el
final, sin música, con la sangre que hierve, la cadena y el viento. Sonidos nuevos: el torno, el disparo y
el silbido del virote, la cadena tensa y la que se parte, las pisadas del gigante, el tejado que se hunde,
el viento del vuelo, la tierra del cráter.

## 8. Modo de pruebas

Instancias: el arzobispo, cada acto (1 a 6, con los dos momentos *God of War* dentro de los actos 4 y 6) y
el final en el río. Un robot (`tools/finale.mjs`) ve la película entera desde cada punto de control, con las
pulsaciones acertadas y falladas (las espringalas se cargan, apuntan y disparan solas; el tramo hasta la
torre se anda solo), y comprueba que pasa por los puntos de control en orden, que nadie muere y que acaba
en el río. `tools/film.mjs` saca fotogramas de cualquier segundo.

## 9. El futuro (no se hace ahora)

- **El objeto verdadero** (nombre provisional): forjado, difícil de conseguir, a través de PNJ que se irán
  añadiendo. Al acabar con un ser maligno muestra su verdadera forma, su **Alma**, la única que se puede
  dañar de verdad: si se le hiere el Alma no puede volver a existir. Matar su forma terrenal revela la
  verdadera, más peligrosa.
- De momento sólo se usará con **Deo Ignoto**: con el objeto, al hundirse el gigante, una cinemática más
  (su Alma sube de la cisterna) y la pelea contra Deo Ignoto; sin él, el final normal. La pelea de Deo que
  ya existe (con escalada) se queda en el código, sin enganchar al director nuevo; habrá que rehacer su
  puesta en escena para que salga del cráter y volver a engancharla (con sus instancias del modo de
  pruebas). Las notas están en `src/game/finale/director.js`.

## 10. Orden de trabajo

1. El armazón de la película (actos, planos, franjas, saltar, puntos de control, el estado del mundo).
2. El gigante para el guion (sin la pelea vieja): actor, animaciones nuevas, cuerpo para chocar.
3. Acto 1 y 2 (cisterna, cráter, muralla, nave, agarrón, vuelo, establo).
4. Acto 3 (la Herrería) y la ciudad que se rompe.
5. Acto 4 (espringala 1 y el momento God of War 1).
6. Acto 5 (la cabalgada).
7. Acto 6 (espringala 2, momento God of War 2 y el final).
8. El modelo: manos, cabeza y el vestido de catedral.
9. Modo de pruebas, robot, documentación y la versión jugable.

## 11. Estado

Hechos los puntos 1 a 7 y el modo de pruebas (instancias por acto) y el robot. Lo que se ha añadido por el
camino, además de lo de arriba:

- **El campo de fuera de la muralla norte**: antes era una ladera que subía hasta las almenas y tapaba el
  cráter; ahora está a ras de la ciudad junto al muro y alrededor del cráter (desde el adarve y las torres
  se ve abierto) y sube hacia el río. Entero, el cráter es un otero que tapa lo alto de la cúpula de la
  cisterna.
- **La cisterna anegada**: tras la cabalgada, la sangre negra del dios la llena casi hasta el techo; hierve
  (humo y pavesas) y en ella se cura y se hunde el gigante. El final ya no pasa por la galería del río: tras
  el amanecer, un fundido y la orilla.
- **Las almenas que revientan**: las del lienzo al oeste de la brecha (el restregón de la cabalgada) y las
  del norte de lo alto de la torre de x=-30 (la mano y la cadena).
- El pergamino del final: las campanas, que antes «siguieron tocando solas», ahora callan.
- **El modelo** (el punto 8): las manos y la cabeza se esculpen aparte, a una celda tres veces más fina
  (`turiferario_hero.js`). Las manos: tres falanges (un hueso más por dedo), nudillos huesudos con sus
  arrugas, tendones y venas en el dorso, la palma con sus montes y sus surcos, uñas de hueso; la derecha es
  el espejo de la izquierda. La cara: la frente surcada, el ceño, los párpados caídos y dos brasas por ojos
  con la pupila en rendija, la nariz podrida, los pómulos y las mejillas hundidas, los labios rotos, los
  dientes largos y la mandíbula desencajada (con piel que se estira al abrir la boca). La jaula se ha
  rehecho para que ningún barrote pase por delante de los ojos. Las costuras: el amito en el cuello, el
  manípulo y la argolla de la cadena en las muñecas. El vestido de catedral (`turiferario_dress.js`): el
  fajón partido atravesado en la joroba, sillares y dovelas clavados en la carne (la joroba, los brazos y la
  cola, con su herida), una viga en el hombro y otra enganchada en la casulla, tejas, cristales de las
  vidrieras en el brazo de la campana, la corona de velas encendida en el cuerno izquierdo (tiembla) y el
  estandarte negro del presbiterio prendido en la aureola (se mece). En el acto 6 la puñalada le revienta el
  ojo derecho: se apaga y la cuenca sangra hasta el final.

- **Pulido de planos**: el pozo del acto 1 (de lado, a ras del borde: el jugador con su antorcha y la
  joroba que asoma con sus púas y sus piedras; el pozo late en rojo y suelta pavesas), el alzamiento del
  acto 2 (por delante y subiendo con la mano: la cámara ya no se mete en la cabeza), y en el acto 6 la
  trampilla, la embestida, el agarre a las almenas, el rugido (contra la torre, erguido: la cara asoma
  entera por encima del parapeto), la caída (de lado, con la muralla al fondo), el hachazo (de frente, a
  través de la cadena), el hundimiento (sin fuegos delante; al fondo, la torre) y el amanecer.

- **Segunda vuelta de pulido** (lo que pedía quien lo jugó):
  - *El audio*: los derrumbes, los rugidos y las pisadas del gigante se hornean una vez en un
    OfflineAudioContext y suenan como muestras; los parámetros lentos, a tasa de bloque; las notas de la
    música se desconectan al acabar; un bus aparte con su compresor para los derrumbes y un tope de
    derrumbes que empiezan a la vez. El hilo de audio trabaja unas cuatro veces menos y el limitador ya no
    aplasta la mezcla (sin cortes, sin silencios, sin saturación). `tools/filmaudio.mjs` lo mide.
  - *Los derrumbes*: lo que revienta se viene abajo de verdad (`collapse.js`): el grupo se ladea hacia
    donde le empujan y se hunde mientras salen trozos de su propia superficie (su piedra, su madera, sus
    tejas, instanciados por material), astillas, tejas sueltas y polvo del color de la luz del sitio
    (`dust.js`): el golpe, la ola a ras de suelo y la nube que se queda.
  - *Las cámaras*: nunca dentro del gigante (se las saca de sus cápsulas) ni atrapadas por las paredes
    invisibles del mapa; `tools/filmclip.mjs` busca los momentos con la cámara metida en algo y dice qué
    plano del guion es. Una luz sigue al jugador mientras está encima del gigante.
  - *El final*: el corazón del dios, en lugar de la caída al cráter, la cadena y los hachazos (ver el acto
    6); y la carrera por la cadena del acto 4, con el salto del cadalso y el latigazo.

Hecho todo el plan. Lo que queda para más adelante (Deo Ignoto y el objeto verdadero) está en las notas de
`src/game/finale/director.js`.
