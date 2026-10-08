# Jefe final: el Turiferario y Deo Ignoto (Plan A)

Plan de diseño y de trabajo del jefe final elegido el 8 de octubre de 2026, entre las tres propuestas de
coloso (las otras dos quedan guardadas en `archive/colosos_propuestas/`, con su explicación).

El jefe final deja de ser el Turiferario de cuatro metros y medio de la cisterna. En su lugar, una pelea
a lo *Shadow of the Colossus* dentro de la ciudad: el arzobispo convertido en un coloso de carne de
21 metros al que hay que treparle para apuñalar sus sigilos. Cuando muere, revienta, la nave de la
catedral estalla desde dentro y detrás se alza su verdadera forma, Deo Ignoto, el dios que dormía en la
cisterna: 56 metros de cuerpo (87 con las manos alzadas), máscara de bronce y seis brazos.

## 1. El recorrido, de la cisterna al río

1. **El rito (cisterna).** Con el anillo se abre el sello y se cruza la niebla, como ahora. Dentro ya no
   hay pelea: una cinemática. El arzobispo (el Turiferario de siempre) está de rodillas ante el altar
   del Dios Desconocido. Se levanta, se vuelve y alza el incensario; el agua de la cisterna hierve, la
   carne del dios le sube por las piernas, le envuelve y le arrastra hacia arriba, a través de la
   cúpula. Temblor, polvo, fundido a negro: *«Arriba, la ciudad tiembla. Las campanas de la Sé tocan
   solas.»* Los escombros de la cúpula ciegan la reja del río.
2. **La subida.** De vuelta por la cripta hasta la nave: temblores, polvo que cae de las bóvedas,
   rugidos lejanos, las campanas. Nada que pelear: es la calma antes de la tormenta.
3. **La Plaza de la Catedral.** Al salir por la puerta de la Sé, el empedrado del atrio del sacrificio
   revienta y se alza el Turiferario coloso (plano de presentación). Los escombros cierran las salidas
   de la plaza: la arena es el atrio, el pórtico y lo que se vaya rompiendo alrededor.
4. **La explosión.** Al apuñalar el núcleo del pecho cae de rodillas, se hincha y revienta en sangre y
   ceniza de incienso; la campana cae tañendo y rueda. La nave estalla desde dentro (la fachada y las
   torres quedan en pie) y Deo Ignoto se alza detrás (cinemática larga). Se enciende un altar nuevo en
   el cruceiro de la plaza: el punto de control de la segunda pelea.
5. **Deo Ignoto.** Pelea desde la plaza contra el dios anclado en la nave.
6. **El río.** Muerto el dios, se desploma en el cráter de la nave. La escalera de la cripta sigue en
   pie entre las ruinas; la reja del río está reventada (el dios salió por ahí). Por la galería, al
   amanecer: la escena final de siempre.

## 2. El Turiferario, coloso (fase 1)

### Modelo (versión 2)

El boceto era una sola masa con pocas formas. La versión de producción:

- **Anatomía:** costillar con costillas talladas y esternón partido, clavículas, omóplatos que se marcan
  al mover los brazos, columna con apófisis, cuello con tendones, cráneo dentro de la jaula, brazos de
  hueso y piel con codo y muñeca marcados, manos de cinco dedos con falanges y uñas de hueso.
- **Piernas de verdad** bajo el alba hecha jirones (para andar y pisotear), con los pies de carne y los
  dedos fundidos; detrás, la **cola de cuerpos**: fieles fundidos con brazos, cabezas y espaldas que se
  distinguen.
- **Ropa:** casulla carmesí con pliegues, cenefas de oro con la cruz en Y por la espalda (el camino para
  trepar), alba de lino manchada de cera y sangre, jirones que cuelgan (cada uno con sus huesos).
- **Cabeza:** jaula de hierro con púas remachada, mitra partida en dos cuernos de hueso, aureola de
  hierro con once cirios con sus goterones de cera.
- **La campana mayor** con su inscripción, el yugo roto y la cadena de eslabones de verdad; arde por
  dentro y echa llamas y humo por los agujeros.
- **Puntos para la pelea:** sigilos del Pacto (nuca, dorso de la mano de la cadena, núcleo del pecho) y
  las zonas por las que se trepa, marcadas en el propio modelo.

### Esqueleto

Raíz, pelvis, tres vértebras, cuello (dos), cabeza, mandíbula, clavículas, brazos, antebrazos, manos y
dedos (tres falanges en los largos), piernas con rodilla, tobillo y dedos, seis huesos de cola, las dos
puertas del costillar, la casulla (delante y detrás, con dos tramos) y ocho jirones del alba. La cola,
la ropa y los jirones se mueven con muelles (inercia, rebote, arrastre); la cadena, con física de
cuerda.

### Animaciones

Todas con anticipación, golpe y recuperación con inercia, y retrasos escalonados (cadera, pecho, brazo y
campana llegan unos detrás de otros), sobre una capa procedural: respiración del costillar, latido de la
carne, temblor de la aureola, la cabeza que sigue al jugador, pies plantados en el suelo por cinemática
inversa y la cola que se arrastra por el empedrado.

| Animación | Qué hace |
|---|---|
| Emerger | Sale del suelo del atrio, se yergue y ruge |
| Reposo / acecho | Respira encorvado, la campana colgando |
| Andar | Paso pesado, arrastrando la campana y la cola; cada pisada tiembla la cámara |
| Girar | Se vuelve sobre los pies, con la campana y la cola detrás |
| Barrido de campana | La lleva atrás y la suelta en horizontal a la altura de los pisos altos |
| Mazazo | La alza sobre la cabeza y la descarga donde estás; se queda clavada |
| Arrancar la campana | Tira de la cadena para sacarla del suelo |
| Pisotón | Levanta el pie y lo planta: onda de choque |
| Zarpazo y agarrón | La garra baja a por ti; si te coge, te levanta y te aprieta |
| Coletazo | Barre por detrás con la cola de cuerpos |
| Rugido | Echa la cabeza atrás; onda que aturde |
| Sacudida | Se revuelve para quitarte de encima (al trepar) |
| Sigilo herido | Se encoge de dolor y se lleva la mano a la herida |
| De rodillas | Cae de rodillas con el costillar abierto de par en par |
| Muerte | Se hincha y revienta |

### Ataques

| Ataque | Aviso | Golpe | Cómo se evita | Qué rompe |
|---|---|---|---|---|
| Barrido de campana | La campana va atrás, gruñido | Arco de 120° a 3–5 m del suelo | Rodar hacia él o alejarse | Balcones, pisos altos, tejados |
| Mazazo | La campana sube, su sombra te sigue | Impacto, onda y fuego | Rodar a un lado en el último momento | El empedrado, lo que haya debajo |
| Pisotón | Levanta el pie | Onda de 6 m | Alejarse de los pies | Carros, barriles, cajas |
| Agarrón | La garra se abre sobre ti | Te atrapa: forcejear para soltarse | Rodar | — |
| Coletazo | Gira la cadera | Barrido de 180° por detrás | Rodar por encima | El pórtico, estacas |
| Rugido | Echa la cabeza atrás | Aturde en 12 m | Rodar justo a tiempo | — |
| Lluvia de cera (fase 2) | Los cirios chisporrotean | Gotas ardientes con charco de fuego | Mirar arriba y apartarse | — |
| Doble giro (fase 2) | Se agacha | Dos vueltas con la campana | Alejarse o pegarse a él | Todo lo que alcance |

### Por dónde se trepa

- **La cola**, cuando la arrastra: de la punta a los riñones y, por la cruz en Y de la espalda, hasta la
  joroba y la nuca (**sigilo 1**).
- **La cadena**, cuando la campana se queda clavada tras un mazazo: de la campana a la mano
  (**sigilo 2**). Si tira de ella contigo encima, te vas con la campana.
- **La garra**, cuando se queda plantada tras un agarrón fallido: de la mano al hombro y, por los
  hombros, a la nuca.
- **De rodillas** (sigilos 1 y 2 muertos): por la casulla hasta el costillar abierto y el núcleo
  (**sigilo 3**).
- En la joroba y en los hombros se puede estar de pie y recuperar aguante.

### Fases

1. Sigilos 1 y 2 vivos: ataques básicos.
2. Muerto uno de los dos: más rápido, lluvia de cera, doble giro, la campana arde más.
3. Muertos los dos: de rodillas con el costillar abierto; se sacude, ruge y escupe ascuas hasta que le
   apuñalas el núcleo.

## 3. Deo Ignoto (fase 2)

### Modelo (versión 2)

Máscara de bronce romana con más detalle (labios, párpados, la grieta con la carne que asoma, la diadema
con DEO IGNOTO), cuerpo de carne que sale de la nave hasta la cintura con caras de fieles grandes como
casas, los tubos del órgano clavados en la espalda, seis brazos de tres tramos con manos de cinco dedos
que agarran y se plantan, raíces de carne que revientan el suelo de la nave y la nave en ruinas a su
alrededor.

### Cómo se pelea

- **Brazos de delante:** agarran las torres; cuando ruge, caen sillares de las torres a la plaza.
- **Brazos de los lados:** sobre los tejados de los barrios; rastrillan los tejados y llueven tejas y
  vigas sobre la plaza.
- **Brazos alzados:** golpean la plaza por turnos (sombra y destello antes del golpe). La mano se queda
  plantada unos segundos: se trepa a ella, se sube por el antebrazo (se corre por encima cuando está
  casi horizontal) y el brazo se alza contigo. En el codo está su **sigilo**: muerto, el brazo se
  desploma sobre las casas.
- **La máscara:** con los dos brazos alzados muertos, el dios ruge, suelta las torres y baja la cabeza
  hasta la plaza. Se trepa por la grieta hasta las cuencas y se apuñalan los **dos ojos**. La máscara se
  parte y el dios se desploma.

## 4. Trepar

- **Agarrarse:** junto a una parte por la que se trepa aparece el aviso; con *interactuar* (E / A) te
  agarras. Al caer junto a él o rodar contra una de esas partes también te agarras.
- **Moverse:** con el stick o WASD por la superficie (arriba, abajo, a los lados); en las partes casi
  horizontales se anda de pie.
- **Aguante:** colgado se gasta; si se acaba, te sueltas. De pie en la joroba o en los hombros se
  recupera.
- **Aferrarse:** cuando se sacude, mantén la guardia (clic derecho / LB) o te tira; aferrado gasta más.
- **Apuñalar:** mantén el ataque para cargar la puñalada y suéltalo; en un sigilo hiere de verdad, en
  la carne apenas.
- **Soltarse:** con la esquiva. Caer desde alto hace daño según la altura.
- **Cámara:** detrás del jugador, apartada de la superficie, y siempre libre para mirar al coloso.

## 5. La ciudad se rompe

Las casas del atrio y de la Calle de la Catedral, el pórtico, los muros que flanquean la Sé y el atrezo
(carro, barriles, cajas, la pira, las estacas, el cruceiro) se construyen como piezas que se pueden
romper: piso alto, tejado, balcones. Al golpe se cambian por ruinas, saltan cascotes con física y polvo,
y lo que cae a la plaza deja montones con su colisión. La campana, los pies, la cola y los brazos del
dios rompen lo que tocan. Si mueres, todo vuelve a estar entero; si ganas, la plaza queda en ruinas para
siempre. La nave reventada es otra versión de la catedral, con la escalera de la cripta transitable.

## 6. Muerte, puntos de control y guardado

- Fase 1: si mueres, vuelves al Altar de la Cripta y el coloso espera en la plaza (entero, como al
  principio). La pelea empieza al volver a salir por la puerta de la Sé.
- Fase 2: el altar del cruceiro (se enciende tras la explosión). Deo Ignoto vuelve a empezar.
- Banderas nuevas: `finale:rite` (visto el rito), `boss:turiferario` (fase 1 ganada: nave en ruinas) y,
  al morir el dios, `boss:turibulario` (la de siempre: abre la reja del río y el resto del juego sigue
  igual).

## 7. Música, sonido e interfaz

- Fase 1: el *Dies irae* del Turiferario (y su segunda fase). Fase 2: tema nuevo de órgano lleno, coro
  que canta *Deo ignoto* y tambores graves. Después del dios, silencio y el amanecer.
- Sonidos nuevos: pisadas colosales con cascotes, la campana (barrido, golpe, tañido al rodar), la
  cadena, rugidos, crujidos de casas que se vienen abajo, la cera que chisporrotea, la puñalada en el
  sigilo, la voz del dios y la máscara que se raja.
- Barra del jefe con el nombre y los sigilos que le quedan; avisos de agarrarse, aferrarse y apuñalar.

## 8. Modo de pruebas y editor (`devmode2004`)

- Escribir **devmode2004** en cualquier momento abre el modo de pruebas (además de F2 en localhost). La
  contraseña no se guarda en claro: sólo su huella.
- Sección **Instancias** para ir directo: el rito, la pelea del Turiferario, el Turiferario de
  rodillas, la explosión y Deo Ignoto, la máscara, el final; y las otras peleas (el Empalado, la huida
  de la Bestia, la caza del Descoyuntado).
- Controles del jefe: matar el sigilo actual, saltar de fase, congelarlo, ver las zonas de trepar y los
  golpes.
- **Modo editor:** cámara libre que se separa del jugador, mover al jugador adonde mira la cámara,
  detener el tiempo y leer coordenadas.

## 9. Arquitectura

```
src/entities/colossus/   modelos y escultor
  sculpt.js              escultor (sólo geometría: también corre en un Web Worker)
  model.js               ColossusModel: esqueleto, mallas con piel y piezas rígidas
  turiferario.js         el Turiferario, versión 2
  deo.js                 Deo Ignoto, versión 2
  build_worker.js        genera las mallas en segundo plano
src/game/finale/         la pelea
  director.js            el guion: el rito, la subida, las fases, las cinemáticas y los puntos de control
  colossus_rig.js        clips, mezcla, capa procedural, muelles e IK de los colosos
  turiferario_boss.js    IA, ataques, campana y cadena, sigilos
  deo_boss.js            IA de los brazos, sigilos, la máscara
  climb.js               trepar: superficies, aguante, sacudidas, puñaladas, caídas, cámara
  wrecks.js              la ciudad que se rompe
src/dev/                 modo de pruebas: contraseña, instancias y editor
archive/colosos_propuestas/  las propuestas no elegidas (y el boceto del Plan A)
```

## 10. Fluidez

- Las mallas se generan una vez, en un Web Worker que arranca al cargar el juego: cuando el jugador
  llega al final (o pide la instancia en el modo de pruebas) ya están hechas.
- Piel con huesos en la tarjeta gráfica; luces del coloso por el pool fijo de ocho (ningún shader se
  recompila en plena pelea); cascotes, partículas y fuegos con presupuesto fijo y reutilizados.
- La niebla y la distancia de dibujo se ajustan a cada fase para ver al gigante sin dibujar de más.

## 11. Pruebas

- Un jugador robot que hace la pelea entera (se agarra, trepa, apuñala, esquiva) y comprueba que se
  puede ganar, morir y reintentar.
- `progress.mjs` actualizado: la progresión completa con el final nuevo.
- Capturas de cada animación y de cada momento de la pelea; medición de fotogramas y de llamadas de
  dibujo.

## 12. Orden de trabajo

1. Archivar los bocetos y la contraseña del modo de pruebas.
2. Modelos versión 2 del Turiferario y de Deo Ignoto, generados en segundo plano.
3. Sistema de animación de los colosos y todas sus animaciones.
4. El guion: el rito, la subida y el coloso en la plaza, con sus ataques.
5. Trepar, sigilos y puñaladas.
6. La ciudad que se rompe.
7. La explosión, Deo Ignoto y su pelea; el camino al río.
8. Instancias y editor en el modo de pruebas.
9. Pruebas, fluidez, documentación.
