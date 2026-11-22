# El Físico que aprende

Hecho el 22 de noviembre de 2026, como se propuso aquí mismo esa mañana: **la historia clínica primero, y luego sus
tácticas entrenadas** con aprendizaje automático, aquí, sin que tengas que entrenar nada tú.

Lo que dijo el autor: todo lo interesante del jefe se perdía (la pelea partida en dos, el daño de la calle que no
contaba en su casa, que saliera sin fin); sus tácticas y sus maneras quizá deberían **entrenarse con machine
learning**, que sería mucho más interesante y **mucho más realista**; pero entonces habría que hablar de cómo se
hace: quién entrena el modelo y cómo se pasa el resultado.

La respuesta corta: **lo he entrenado yo, aquí**, con el procesador (cuatro núcleos; unos cuarenta minutos en total,
en varias tandas), contra jugadores de prueba de diez maneras; el resultado es un archivo de pesos de 15 KB
(`src/game/fisico_red.json`) que va dentro del juego y se ejecuta en el navegador en microsegundos, sin servidor y sin
tarjeta gráfica. Si un día quieres volver a entrenarlo tú, es un solo comando (§4).

## 1. Lo que ya estaba (la una sola vida)

- **Una sola vida**, la de la calle y la de su casa (`game/fisico.js`, flags `fisico:vida`): lo que le haces en la
  caza se queda; herido, se retira andando a su puerta; con la mitad o menos **se encierra** y te espera en su sala.
- **No aparece de la nada**: sale de su casa por su puerta y vuelve a ella andando.
- **Su sala**: de 8 × 16 m, con su galería; al empezar la pelea cierra la puerta de un portazo.

## 2. La historia clínica (aprende de ti mientras juegas)

`game/fisico_historia.js`. Te estudia: en la calle y en su sala apunta (en tu partida, flags `fisico:historia`) lo que
haces cuando le tienes delante, **sin leer el mando**:

- hacia dónde ruedas cuando ves venir un golpe suyo (a tu izquierda, a tu derecha, atrás, hacia él) y **cuándo**: a
  tiempo, tarde o **antes de tiempo** (el miedo que va por delante);
- si desvías (y si te sale, y si a destiempo), si te cubres y si se te cae el brazo (te rompe la guardia);
- cuándo bebes: con cuánta vida y con él cuánto de cerca;
- si huyes cuando te ves herido;
- cómo golpeas: cuántos golpes por minuto y de cuántos en cuántos;
- en la calle: si subes a los tejados, si te metes en las casas, si pisas los cepos, si te duerme, si te sueltas de
  la esponja, si caes;
- y qué golpes suyos te entran más que los demás.

Lo viejo pesa menos: a cada encuentro nuevo (una caza, un intento en su sala), lo apuntado se queda en un 70 %.

**Y lo usa**, como lo usaría alguien que pelea de verdad:

- **apunta adonde sueles rodar**: si casi siempre ruedas a tu izquierda, la vara barre (y la punta pica) un poco hacia
  ese lado, lo que cabe en el arco de cada golpe (26° la vara de lado, 10° la punta);
- **retiene el golpe** si te adelantas: lo empieza más despacio, como quien espera a que salgas de la voltereta (el
  impacto llega un tercio de segundo más tarde);
- y **lo dice**: al rato de empezar la consulta, lo que tiene más claro («Ruedas a tu izquierda. Lo tengo apuntado.»,
  «Te asustas antes de tiempo. Es un síntoma.»); y cuando te coge justo con eso, de vez en cuando, «¿Ves? Lo tenía
  apuntado.»
- **La hoja de su mesa** (la historia clínica del que no se arrodilló) crece con lo que ha apuntado de ti, en su letra:
  «Observado: — Rueda hacia su izquierda cuando ve venir el golpe. — Se cubre y se cubre, hasta que se le cae el
  brazo. … Tratamiento: — Barrer hacia su izquierda. — Cansarle el brazo. El gancho pasa por encima del escudo.»

## 3. Sus tácticas, entrenadas

### Qué aprende y qué no

- **No** los golpes ni las animaciones: están hechos a mano, con sus tiempos (cuándo se ve venir, cuándo se desvía,
  cuándo queda expuesto). Si eso lo aprendiera una red, los golpes serían injustos o raros.
- **Sí la táctica**: qué hace en cada momento (`game/fisico_mente.js`). Cada poco (de 0,3 a 0,45 s, o en cuanto acaba
  un golpe) elige entre dieciocho cosas: **guardar su distancia** (la de la vara, 2,9 m; la de los hierros, 1,8; la del
  cauterio, 2,4), **acercarse**, **apartarse** un paso, **rodearte** por un lado o por el otro, **esperar** a que te
  descubras, **cada uno de sus golpes** (los que tenga a mano en ese tiempo de la pelea: la vara de lado y de punta, el
  gancho, la esponja, el sahumerio; la sierra, la lanceta, el trépano; los cauterios y la cal) o **amagar** (empezar
  un golpe y dejarlo a medias, para que ruedes antes de tiempo, y entonces el de verdad).
- **Lo que ve**, como lo vería alguien en esa sala: a qué distancia estás y por qué lado, si vienes o te vas; si
  atacas, ruedas, bebes, te cubres o estás tambaleándote, y por dónde vas de eso; tu vida, tu aliento y tus ampollas; su
  propia vida y su tiempo de la pelea; lo que le falta para volver a golpear; lo que tiene detrás (la pared) y lo que
  tienes tú; la nube de beleño, los Coronados que llamó, lo que arde; y **lo que tiene apuntado de ti** (la historia
  clínica).
- **Con reflejos de persona**, que no se pueden saltar porque están en la cabeza, no en lo que se premia: decide sobre
  lo que vio **hace un cuarto de segundo** (0,28 s); lo que decide de moverse lo **sostiene** (no cambia de idea a cada
  fotograma); **no amaga** más de una vez cada cinco segundos; tras un amago, golpea. Si esquivas bien, es porque has
  esquivado bien.
- **Con aliento**, como tú: cada golpe le cuesta (la sierra, mucho; un amago, poco) y lo recupera respirando, más
  despacio mientras golpea; sin el aliento que pide un golpe, no lo da. Nadie golpea sin parar: después de una racha
  tiene que respirar, y ahí tienes tu hueco. (Lo ve, y aprendió a administrarlo.)
- La campanilla (llamar a los suyos) sigue siendo cosa del guion: la toca una vez, cuando tiene sitio.

### Cómo se entrenó

- **Dónde**: en una copia simplificada de la pelea (`tools/fisico_sim.mjs`) que juega una pelea entera en unos
  quince milésimas de segundo: la sala de verdad con sus muebles (sacados de las cajas de colisión del juego), los
  golpes de él con sus tiempos, alcances y arcos (los de `entities/fisico.js`), lo que engancha, duerme, taladra,
  ciega o prende, los tres tiempos con la máscara y el brasero, el equilibrio y el desvío; el jugador con la espada y
  el escudo, sus golpes, la voltereta (cuándo no le tocan), el parry, la guardia, el aguante, las ampollas, la nube y
  el fuego; y los dos Coronados, a lo sencillo. Su cabeza es la misma del juego, y su historia clínica, la misma.
- **Contra quién**: diez maneras de jugar (`tools/fisico_bot.mjs`): el agresivo, el cauto, el que desvía, el que rueda
  siempre a su izquierda, el que rueda a su derecha, el del escudo, el que bebe a cada rato, el que huye herido, el
  novato y el veterano. Cada uno ve con su retraso de persona, mide los golpes con su error, se adelanta o no, se deja
  engañar por un amago o no (lo que lee), castiga lo que se deja abierto, guarda su distancia, se cansa de esperar y
  entra. Cada pelea, con algo de lo suyo (±15 %), y unas veces con la historia clínica que tendría de haberle visto
  antes, otras sin nada.
- **Comprobado contra el juego** (`tools/fisicobanco.mjs`): los mismos jugadores de prueba, traducidos a teclas,
  contra el Físico de verdad en el motor. Con la misma cabeza, el simulador y el juego dan lo mismo en lo que importa
  (cuántos golpes lanza el jugador y cuántos entran, desde qué distancia, cuántas volteretas, qué maneras de jugar le
  van mejor o peor a él); en el juego las peleas duran algo más (cada golpe congela el tiempo un instante).
- **Cómo**: estrategias evolutivas (`tools/entrena_fisico.mjs`): cada generación prueba 48 variaciones pequeñas de la
  red (y sus contrarias) en las mismas 12 peleas, y la mueve hacia las que mejor le salen; cada diez generaciones, una
  prueba fija de 120 peleas, y se guarda la mejor. 1 300 generaciones en total, en tres tandas (la última, con su
  aliento).
- **Qué se premia** (`valor`, en `fisico_sim.mjs`): lo que te quita (en vidas tuyas) menos lo que le quitas (en
  cuartos de la suya); y lo que quiere, que es dormirte (y antes, cogerte: el gancho que entra, la esponja y el trépano
  que agarran); **y se castiga lo que no haría nadie**: los golpes al aire (lejos de su alcance, sin que nada los pare)
  y quedarse lejos sin pelear.
- **La red**: una capa de 32 neuronas entre las 46 cosas que ve y las 18 que puede hacer; 2 098 números.
- **Lo que se corrigió por el camino**, porque una red que aprende sola encuentra lo que no haría nadie (aquí, en los
  jugadores de prueba): uno se cubría aunque no le quedara aliento, y la red aprendió a rompérselo una y otra vez; otro
  se quedaba cubriéndose dentro del fuego. Ahora sin aliento ruedan, y del fuego salen soltando la guardia. Y él, que
  encadenaba cauterios sin pausa, tiene aliento.

### Lo que sale

**Su manera de pelear** (lo que aprendió; nadie se lo dijo): con la vara, guarda su distancia (casi tres metros) y te
rodea, barre de cerca, pica o amaga de lejos, y el sahumerio, si te alejas; con los hierros se te echa encima con la
sierra; con el fuego vuelve a la distancia y pica con el cauterio, para que arda donde pisas. Si bebes, te castiga; si
ruedas o te tambaleas, se te acerca; y lo que tiene apuntado de ti lo usa (al que rueda a su izquierda, le barre hacia
su izquierda; al que se adelanta, le retiene el golpe; al que desvía, le amaga).

**En el juego de verdad** (`tools/fisicobanco.mjs`, los diez jugadores de prueba, seis peleas cada uno, desde la vida
entera; lo que le quita al jugador por pelea, las veces que cae, lo que dura):

| | El de antes (a suertes) | La misma cabeza, a mano | Entrenado (el que hay) |
|---|---|---|---|
| Lo que te quita por pelea | 444 | 479 | **651** |
| Veces que caes por pelea | 2,3 | 2,3 | **3,5** (2,9 sin el del escudo) |
| Golpes al aire por pelea | 0,6 | 1,3 | 0,9 |
| Amagos / golpes retenidos | 0 / 0 | 0 / 2,9 | 4,3 / 5,0 |
| Lo que dura | 123 s | 133 s | 152 s |

Por jugador de prueba (veces que cae; antes → ahora): el agresivo 1,3 → 3,0; el cauto 2,0 → 2,2; el que desvía
0,7 → 1,3; el que rueda a su izquierda 1,7 → 4,3; a su derecha 2,8 → 3,3; el del escudo 4,3 → 8,8; el que bebe a cada
rato 2,0 → 2,5; el que huye 4,5 → 3,3; el novato 1,8 → 4,2; el veterano 1,5 → 1,8.

Es decir: **más listo, y algo más duro**, sobre todo con los malos hábitos (rodar siempre al mismo lado, beber con él
encima, cubrirse en el fuego, el novato); al que juega bien (el veterano, el que desvía) apenas le cuesta más. Al que se
queda cubriéndose en el tercer tiempo, el fuego le cuesta caro: es lo que dice su aforismo. (Lo más duro que sabe, sin
aliento, era el doble de duro: 5,4 caídas por pelea; no se ha dejado así.)

## 4. Si quieres entrenarlo tú

La dureza está en un sitio, `DUREZA` en `src/game/fisico_pelea.js`: lo que tarda en ver (0,28 s) y la temperatura de
lo que elige (1,3: algo más variado que como se entrenó). Para ablandarle sin cambiar su manera, 0,36 y 2,5; para lo
más duro, 0,25 y 1.

Sin nada que instalar aparte de lo del juego (Node y `npm install`):

    node tools/entrena_fisico.mjs 400 src/game/fisico_red.json src/game/fisico_red.json

sigue entrenando la red que hay (unos quince minutos en un ordenador de cuatro núcleos) y la guarda si mejora. Para
ver lo que hace en el simulador, `node tools/fisico_sim.mjs todos 30 red` (o `manual`, la manera hecha a mano); y en
el juego de verdad, con `npx vite --port 5199` abierto, `node tools/fisicobanco.mjs todos 4 red` (o `manual`, o
`antes`: la de antes de todo esto). Los jugadores de prueba están en `tools/fisico_datos.mjs` (ESTILOS): se pueden
cambiar o añadir.

## 5. Lo que queda por decidir

1. **Tus peleas, grabadas.** Un modo de grabación (Opciones › *Grabar mis peleas*) guardaría lo que haces en cada pelea
   con él y se exportaría a un archivo para el repositorio (`datos/peleas/`). Con eso, un jugador de prueba que juega
   **como tú** para entrenarle contra ti, y una medida honrada de si es más difícil o sólo más injusto. No está hecho:
   ¿lo quieres?
2. **Cuánto castiga.** Hoy, algo más que antes (la tabla de §3), con los reflejos de una persona. Se puede ablandar o
   endurecer con `DUREZA` (§4), y podría ir a un mando en Opciones. Para un jefe a mitad de una partida de una hora,
   ¿más difícil que el Caballero de la Orden, o menos?
3. **¿Sólo el Físico?** Lo mismo serviría para sus Coronados (que le avisen y te cierren el paso) y, más adelante, para
   otros jefes.
