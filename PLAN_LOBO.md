# El Lobishome: el jefe de lo oscuro, en las cloacas de la Sé

Propuesta del 7 de noviembre de 2026 para el jefe que pidió el autor, **hecha** el mismo mes con los cambios que pidió
después (§0). El plano de la propuesta, a escala: `docs/planos/plan_lobo.png` (`tools/planos/plan_lobo.py`); lo que
quedó, en `world/cloacas_hondas.js`.

## 0. Lo que se hizo (y lo que cambió)

El autor pidió, al aprobarlo: que fuera **el alcantarillado** (no cuevas), **más amplio**, con **un acceso que tuviera
sentido**, y que **la zona y la pelea fueran mucho más laberínticas**; y, de paso, fuera los objetos que dan más vida
(la Raíz del Vergel) y, en su lugar, **un consumible que se prepara** en la mesa del Desfigurado con lo que se cosecha
en lo más hondo, muy lejos y muy difícil (unos diez minutos de bajada), que rebrota cada quince minutos si te alejas, y
que da mucha más regeneración de aguante (el débil, barato; el fuerte, caro, con más velocidad), tres débiles y un
fuerte como mucho, y que no se rellena al morir. Así quedó:

| Del plan | Lo que hay |
|---|---|
| El paso oscuro de roca, con su derrumbe que él cava | **La galería de la Sé**, de sillería, del muro del norte del colector; a los cinco metros, **una reja con cadena y candado**: la cerró el Desfigurado, que te da la llave (`desf:llave`) |
| La gruta del Vergel | **El colector** de los romanos: pilares, bóvedas de arista, el rellano de la boca con su cascada, canales con sus cantos, el estanque, la fuente, los tramos hundidos bajo el huerto (`world/vergel.js`) |
| La galería de los lobos y la Fosa de los Pobres (un óvalo) | **La lobera**: un laberinto de galerías y cruces (7 × 6, con bucles) con **el pozo de las ánimas** (la luna) y **el osario** (su cama y lo que entierra); la pelea es en todo el laberinto, con su niebla a la entrada y a la salida |
| Ocho braseros en la arena | **Trece braseros** en los cruces y las salas, que se encienden con el farol; él los vuelca y el aullido los apaga |
| Fase 3: la fosa que se hunde | **Fase 3**: el aullido lo apaga todo y vuelve a cazar; **la luna del pozo** lo deja quieto, mirándola (se le pega a gusto) |
| La reja de los pobres (atajo a la cripta honda) | La salida de la lobera baja a **las cloacas viejas**, **los aljibes ahogados** y **lo hondo** (el ninfeo, las plantas que muerden, la cosecha), y de lo hondo, **el pozo de la tapa** sube al Vergel |
| El premio: la flor de lo hondo, para él | **La flor de lo hondo** es lo que hace el **cocimiento negro**; él te enseña a cocerlo (`game/alquimia.js`) |
| El giro (es su hermano) | Vencido el lobo, **te lo dice** (`desf:lobo`) |

**Queda** (no está hecho): la flor blanca que se cierra cuando él está cerca (el aviso en el marcador); la presa (te
agarra y te arrastra a lo oscuro) y el entierro; el salto desde la bóveda; sus candiles apagados por el camino y el
acecho de antes de la pelea (ahora la primera vez que se le ve es al cruzar la niebla); el hombre que se le ve a la luz
de la luna al morir (cae como lobo); los dos finales del Desfigurado (su remedio y el amanecer, o los dos pares de
ojos); el colmillo y la lumbre mayor del farol como premios. Prueba de la pelea: `tools/lobo.mjs`.

Lo que pidió el autor:

- **Un jefe nuevo**: algo así como **una especie de hombre lobo** que **habita en las catacumbas** y que **aprovecha
  la oscuridad para moverse**.
- Va con lo del Desfigurado: él **teme que la oscuridad se esté infiltrando en las catacumbas**, y busca una cura.

## 1. Lo que ya hay (y lo anuncia)

El Vergel (`world/vergel.js`) ya deja el sitio preparado y el miedo sembrado, sin enseñar al jefe:

- **El paso oscuro**, en el rincón del nordeste de la gruta: sale hacia el norte, hacia la Sé, y a los diez metros
  acaba en **un derrumbe** (no se pasa). Por la rendija de arriba sale aire frío y, si te quedas quieto, se oye algo
  grande que respira (el ambiente `oscuro`: la respiración, unas uñas en la piedra y, alguna vez, un gruñido).
- **Lo verde se muere** a la entrada (el musgo gris y luego negro, los helechos secos, los hongos apagados), **la
  negrura** rezuma del suelo, hay **zarpazos** en la roca, más altos que la cabeza de un hombre, y **una cabra**
  arrastrada hacia lo oscuro y abierta, no comida.
- **La raya de candiles**: sal de pared a pared, siete candiles encendidos y sus flores blancas. «Lo oscuro no pasa la
  luz. Eso creo. Eso quiero creer.»
- **Los ojos**: si te acercas a la raya y miras hacia el paso, alguna vez, un instante, se encienden dos ojos al fondo,
  más altos que los de un hombre, y se oye un gruñido (`game/cloaca.js`).
- **Lo que dice el Desfigurado** (`DIALOG.desfOscuro`): «Anda a cuatro patas cuando no quiere que lo oigas, y de pie
  cuando quiere que lo veas»; «Lo que me cura, si existe, está en lo más hondo. Y lo más hondo es lo suyo».
- **Su cuaderno de remedios** acaba igual: «Lo más hondo es lo oscuro. Y en lo oscuro hay algo».

## 2. Quién es

**El Lobishome** (el hombre lobo del folclore del Miño y de Galicia: *lobishome*, *lobisomem*). Se propone que fuera
alguien, como todos los jefes del juego (el Rey, el Caballero, Leonor):

- **Bento, el sétimo.** En el Miño se dice que el séptimo hijo varón, si no hay una hermana entre medias, sale
  lobishome, a menos que lo bautice el hermano mayor y le ponga Bento. Bento era el séptimo de una familia de
  sepultureros: los que enterraban a los pobres en **la necrópolis de los pobres**, la vieja, la de antes de la Sé,
  que ya nadie visitaba. Su hermano mayor lo bautizó, como manda la costumbre, y la maldición no salió.
- **La campana no la oyó**: estaba abajo, cavando, bajo tres varas de tierra. No se arrodilló. Pero la necrópolis de
  los pobres linda con las catacumbas de la Sé, y las catacumbas con el pozo de la fuente sin nombre: lo que subió por
  ellas no le pidió que se arrodillara. Le encontró lo que tenía dormido.
- **Lo que queda de él**: una bestia que no soporta la luz y se mueve por lo oscuro como por agua; que entierra a sus
  presas en los nichos vacíos (aún cava); y que, a la luz de la luna, se queda quieto, mirándola, como el Desfigurado.
- **El giro (recomendado, ver §10)**: el hermano mayor que lo bautizó **es el Desfigurado**. No lo dice hasta el
  final. Lo sabe: «Lo vi una vez, mirándome desde lo negro. Sólo los ojos. Más altos que los míos». Busca la cura para
  los dos.

## 3. Dónde vive: la Fosa de los Pobres

Una zona nueva, **entre el paso oscuro del Vergel y las Catacumbas de la Sé**, bajo el centro de la ciudad (roca
libre: las bodegas del canónigo quedan al este y se rodean). Unos 100 m de punta a punta. Norte = −z.

```
                    ┌ Catacumbas de la Sé (ya están; a −10,6) ┐
   z −86  ··········│ c1Sur ═══╗ (su cabo del este, cerrado)  │
                    └──────────║──────────────────────────────┘
                               ║  la reja de los pobres (se abre desde la Fosa: atajo)
   z −64     ┌─────────────────╨──────┐
             │   LA FOSA DE LOS POBRES │  la arena: óvalo de 22 × 20 m, a −11,5
             │  ◯ braseros ◯  · pozo  │  nichos de pared a pared, ocho braseros apagados,
             │   ◯   (la fosa común)◯ │  la fosa común en medio (se hunde en la fase 3)
   z −44     └───────────╥────────────┘
                         ║  la galería de los lobos: 60 m, a oscuras, con tramos
                         ║  de luz (los candiles de él, apagados por el camino)
   z −14       ╚═════════╩══════════╗
                                    ║ el paso oscuro (ya está: x 24,6 a 27,4)
   z −0,6                     ▓▓ derrumbe ▓▓
   z 9,6       EL VERGEL ─────── la raya de candiles
```

- **El paso oscuro** sigue al norte tras el derrumbe hasta z −14, gira a poniente bajo la plaza del Pan y sube al
  noroeste hasta la Fosa: **la galería de los lobos**. Es un acueducto romano con los nichos de los pobres en las
  paredes: oscuridad casi total, con tramos donde el Desfigurado tenía candiles (apagados, tirados) y dos o tres
  sumideros de calle por donde baja la luna. Es el acecho de antes de la pelea (§6).
- **La Fosa de los Pobres** es la arena: un óvalo de 22 × 20 m, a la altura del Vergel (−11,5), con la bóveda a 9 m.
  Columbarios de pared a pared (miles de nichos pequeños, con sus tejas), un anillo de seis pilares, **ocho braseros
  de hierro** en sus pies (apagados al entrar), **candiles** en los nichos (apagados), **la fosa común** en medio
  (cubierta de tablones y tierra: se hunde en la fase 3) y, en la bóveda, **el pozo de las ánimas**: un brocal de una
  casa de arriba por el que baja una raya de luna sobre la fosa. Al fondo, la reja que da a las catacumbas de la Sé.
- **Después** (vencido el jefe): la reja de los pobres se abre desde la Fosa y une la cripta honda con la cloaca y la
  plaza del Pan: **un atajo**, como el rastrillo de la cárcel o el ascensor del lucernario.

## 4. Cómo se mueve por lo oscuro (lo que lo hace distinto)

La idea: **la luz es del jugador y la oscuridad es suya**. Se pelea por el terreno.

- **El mapa de luz.** Cada punto de la arena tiene su luz: el farol del jugador (un círculo de unos 4 m alrededor de
  él), los braseros encendidos (6 m cada uno), los candiles de los nichos (2 m) y la raya de luna del pozo. Se
  calcula al vuelo, como lo que ya alumbra el pool de luces dinámicas.
- **En lo oscuro es invisible**: sólo se le ven **los ojos** (y la silueta, un instante, al cruzar el círculo del
  farol). Va deprisa, a cuatro patas, y **no hace ruido** salvo las uñas en la piedra (el sonido es la pista; con
  cascos se le oye por dónde viene).
- **En la luz se le ve y le cuesta**: de pie, más lento; si un golpe le alcanza estando en la luz, **se deslumbra**
  (un respiro de dos segundos para pegarle a gusto). Por eso no entra en la luz si puede evitarlo: rodea los braseros
  encendidos, ataca desde el borde de lo oscuro y vuelve a él.
- **Encender los braseros.** El jugador enciende un brasero con su farol (interactuar, un segundo largo, en el que es
  vulnerable). Cada brasero encendido le quita terreno. **Él los apaga**: los vuelca de un zarpazo o los apaga con el
  aullido. La pelea es un tira y afloja por la luz.
- **El farol del jugador**, que ya existe (la luz que se lleva), es su vida: el aullido lo hace temblar y lo deja a la
  mitad unos segundos (el círculo encoge); si te agarra y te arrastra a lo oscuro, se apaga del todo hasta que lo
  sacudes.
- **La flor blanca** (la que da el Desfigurado al conocerle) sirve aquí: en el inventario, **se cierra cuando él está
  cerca en la oscuridad** (su icono, en el HUD, junto al farol). Es la única manera de saber que está detrás de ti.
  Sin la flor se puede pelear, pero a oído.

## 5. La pelea

**Tres fases**, con su niebla en la puerta, su barra y su música (el tema de la cripta, con un tambor de pasos).

| Fase | Cuándo | Qué hace él | Qué hace el jugador |
|---|---|---|---|
| 1. **La caza** | de 100 % a 65 % | No se deja ver: entra desde lo oscuro, golpea y vuelve a lo oscuro. Apaga los candiles de los nichos al pasar. | Encender braseros para quitarle sitio; aguantar en la luz; pegarle cuando sale. |
| 2. **A la luz** | de 65 % a 30 % | Rabioso: pelea de pie, en abierto, con golpes largos; vuelca braseros; aúlla para apagar todo lo que hay a su alrededor. | Volver a encender; esquivar las embestidas; aprovechar los deslumbramientos. |
| 3. **Lo hondo** | de 30 % a 0 | Se hunde la fosa común: todo cae a la fosa, abajo, a oscuras; sólo la raya de luna del pozo y el farol. Herido, más lento y más bruto. Si pisa la luz de la luna, **se queda quieto mirándola** unos segundos. | Llevarlo a la luna. |

**Sus golpes** (con su aviso y lo que se le opone):

| Golpe | Aviso | Contra |
|---|---|---|
| **Zarpazo doble**, de pie | se yergue y abre los brazos | se desvía o se para con el escudo |
| **Embestida** desde lo oscuro, a cuatro patas | los ojos se encienden y se oyen las uñas acercándose | esquivar de lado; en la luz, se desvía (en lo oscuro, no: golpe que no se puede desviar) |
| **Dentellada y presa** | se agacha, la boca abierta | si te coge: te sacude y te arrastra hacia lo oscuro; se suelta pulsando (como la presa del Descoyuntado) |
| **Salto desde la bóveda** | cae polvo y tierra de arriba; en lo oscuro trepa por los nichos | salir de debajo |
| **Aullido** | se para y echa la cabeza atrás | apaga los candiles y los braseros a 8 m y hace temblar el farol; deja sin aliento si se está cerca; se le puede pegar mientras aúlla |
| **Volcar el brasero** | va a por el brasero más cercano a ti | ponerse entre él y el brasero; volver a encenderlo |
| **El entierro** (fase 3) | te agarra y te mete en un nicho | soltarse antes de que lo tape |

Vencido, **a la luz de la luna se le ve otra vez el hombre**: un sepulturero flaco, con su pala rota al lado.

## 6. Antes de la pelea: la galería de los lobos

Lo que da miedo de verdad es que **no aparezca**. En la galería de 60 m que lleva a la Fosa:

- Tramos a oscuras con algún candil apagado en el suelo (los del Desfigurado: los llevó hasta aquí); dos sumideros
  con su raya de luna; nichos con lo que entierra (la cabra que faltaba, un perro, un soldado).
- **Te sigue sin dejarse ver**: los ojos al fondo, que se apagan cuando te vuelves; una raya de luna que se oscurece un
  instante (algo ha pasado por delante); un candil que se apaga detrás de ti; la flor que se cierra y se abre.
- **Nunca ataca en la galería**: sólo enseña que puede. La primera vez que se le ve entero es al entrar en la Fosa,
  colgado de los nichos de la bóveda, mirando cómo entras.

## 7. El cuerpo

- **De pie, 2,3 m**; a cuatro patas, a la altura de la cintura. Flaco hasta el hueso, las costillas y la columna a la
  vista, los brazos demasiado largos, las manos con uñas negras de cavar. Lo que queda de pelo, en mechones, sobre una
  piel gris (con el mismo «partir» que la cara del Desfigurado: islas de la peste). La cara, a medio estirar: la
  mandíbula de lobo saliéndole de una cara de hombre. Los ojos, ámbar, que se encienden (como el ojo malo del
  Desfigurado: la misma peste).
- **Dos maneras de moverse**: de pie, con la marcha de siempre (`Biped`), encorvado; a cuatro patas, como el
  Descoyuntado (su andar propio, rápido y bajo). Pasa de una a otra (se deja caer adelante, se yergue).
- **Lo que lleva**: los jirones del sayo de sepulturero y una cuerda con las llaves de la necrópolis.
- **El sonido**: la respiración (la del ambiente `oscuro`), las uñas en la piedra, el gruñido (ya está: `snarl`), un
  aullido nuevo, largo, que retumba en la bóveda, y la pala que arrastra en la fase 3.

## 8. El Desfigurado, antes y después

- **Antes**: lo que ya dice (§1). Si se recomienda el giro (§2), en la última charla antes de la Fosa añade: «Si lo
  ves... no lo mires a los ojos. Y si puedes... no lo dejes en lo oscuro.»
- **Cuándo se abre el paso.** El derrumbe se cava **desde el otro lado**: al volver de la cripta honda (con los Velados
  vencidos), la raya de candiles está apagada y volcada, el derrumbe tiene un agujero y el Desfigurado no está en su
  botica: está en la luz, mirando arriba, y dice «Ha cavado. Desde el otro lado. Ya no hay derrumbe».
- **El premio, para él**: en lo más hondo de la Fosa, donde cae la luna, crece **la flor de lo hondo** (blanca por
  fuera y negra por dentro). Es lo que le falta a su cuaderno.
- **Dos finales para él** (a elegir, §10): si se la llevas, se prepara su remedio, y en el amanecer del final se le ve
  arriba, en la plaza del Pan, de cara al sol, que ya no le quema: «Hermosa». Si no, la última raya del pilar no está,
  la raya de candiles se apaga y en lo oscuro hay dos pares de ojos.
- **Para el jugador**: el atajo a la cripta honda; **el colmillo** (un objeto bendito, de los que favorecen una manera
  de pelear y castigan otra: más daño en lo oscuro, menos aguante en la luz); y la lumbre del farol mejorada (su círculo,
  un metro más).

## 9. Lo que cuesta (y lo que ya hay)

- **Ya hay**: la marcha bípeda (con el pie clavado: `locomotion.js`), el andar a cuatro patas del Descoyuntado, la
  presa con su forcejeo, los golpes que no se pueden desviar, las nieblas de jefe, la barra, el pool de luces
  dinámicas, el farol del jugador, los hongos y candiles del Vergel, el sonido del gruñido.
- **Nuevo**: el mapa de luz y el sombreador del cuerpo que se apaga en lo oscuro (sólo los ojos); los braseros que se
  encienden y se apagan (interactuables con luz dinámica); el aullido que apaga luces y hace temblar el farol; la
  fosa que se hunde; el acecho de la galería; el modelo y sus dos maneras de andar; dos zonas nuevas (la galería y la
  Fosa) y la reja del atajo.

## 10. Lo que tiene que decidir el autor

1. **¿El nombre?** El Lobishome (recomendado: es el del folclore del Miño y de Galicia), el Lobisomem, la Bestia de lo
   Oscuro...
2. **¿Quién era?** Bento, el sétimo, sepulturero de la necrópolis de los pobres (recomendado), o una bestia sin pasado.
3. **¿Es el hermano del Desfigurado?** Se recomienda que sí, y que no se diga hasta el final.
4. **¿Dónde?** La Fosa de los Pobres, entre el Vergel y las Catacumbas de la Sé (recomendado), o dentro de las mismas
   catacumbas de la Sé (menos obra, pero son ya otra cosa), o bajo el castillo, por la necrópolis de las mazmorras.
5. **¿Cuándo se abre?** Al volver de la cripta honda (recomendado: es un jefe de la segunda mitad), o con una
   herramienta (un pico) cuando se quiera.
6. **¿La flor blanca como aviso** (se cierra cuando él está cerca)? Se recomienda que sí.
7. **¿Los dos finales del Desfigurado**, o sólo el bueno?

## 11. Cómo se haría (si se aprueba)

| Fase | Qué |
|---|---|
| L1 | La galería de los lobos y la Fosa (`world/fosa_pobres.js`, con sus medidas), la reja del atajo, la luz (la raya de luna del pozo), las zonas, el mapa, el ambiente y la música. |
| L2 | El mapa de luz (`game/luz.js`): el farol, los braseros que se encienden y se apagan, los candiles; el aullido que apaga. |
| L3 | El cuerpo (`entities/lobishome.js`): el modelo, el sombreador de lo oscuro, sus dos andares, los golpes con sus clips. |
| L4 | La pelea (`game/lobishome.js`): la caza, a la luz, lo hondo (la fosa que se hunde), la presa y el entierro; la niebla, la barra; el acecho de la galería. |
| L5 | El Desfigurado antes y después (el derrumbe cavado, lo que dice, la flor de lo hondo, los dos finales), los premios, los textos y el README. |

Pruebas: una nueva, `tools/lobo.mjs` (como `caballero.mjs` o `rey.mjs`): la pelea con jugadores de prueba, que la
caza no sea imposible a oscuras y que con todos los braseros encendidos no sea un paseo; `golpes.mjs` (los suyos);
`arranque.mjs` (que no patine al pasar de cuatro patas a dos); `cloacawalk.mjs` hasta la Fosa; `holes`, `zfight`,
`camclip` y `rendimiento` en lo nuevo.
