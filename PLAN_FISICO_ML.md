# El Físico que aprende (propuesta)

Propuesta del 22 de noviembre de 2026 para las tácticas de Mestre Clemente, el Físico de los Inocentes. **No está
hecha**: espera a lo que decida el autor (§6).

Lo que dijo el autor: todo lo interesante del jefe se perdía (la pelea partida en dos, el daño de la calle que no
contaba en su casa, que saliera sin fin); sus tácticas y sus maneras quizá deberían **entrenarse con machine
learning**, que sería mucho más interesante y **mucho más realista**; pero entonces habría que hablar de cómo se
hace: quién entrena el modelo y cómo se pasa el resultado.

## 1. Lo que ya está hecho (en esta rama)

- **Una sola vida**, la de la calle y la de su casa (`game/fisico.js`, flags `fisico:vida`): lo que le haces en la
  caza se queda; no se cura al volver a salir ni cuando caes tú. Herido, se retira andando a su puerta, a la vista;
  con la mitad de la vida o menos **se encierra** en su casa (la tranca cae por dentro) y ya no sale: te espera en
  la sala grande, en su mesa, cosiéndose. La pelea empieza con la vida que le quedó y en el tiempo que le toque. Si
  caes en esa pelea, vuelve a empezar desde ahí (lo de la calle no se pierde).
- **No aparece de la nada**: sale de su casa por su puerta y vuelve a ella andando (antes salía por la puerta de
  cualquier casa curada que no estuvieras mirando).
- **Su sala**: de 8 × 16 m, abierta hasta las cerchas, con su galería; al empezar la pelea cierra la puerta de un
  portazo (antes la pelea se escapaba al zaguán).
- **El banco de pruebas**: `tools/fisicopelea.mjs` pone a pelear al Físico contra un jugador de prueba en el motor de
  verdad (agresivo, cauto o quieto) y resume lo que pasa: los golpes que da y los que entran, los tiempos de la
  pelea, los Coronados que llama, el fuego, las veces que te duerme o te agarra, el daño de cada uno y por dónde se
  mueve. Es lo que haría falta para medir cualquier cambio de sus tácticas, aprendidas o no.

## 2. Qué aprendería y qué no

- **No** los golpes ni las animaciones: están hechos a mano, con sus tiempos (cuándo se ve venir, cuándo se puede
  desviar, cuándo queda expuesto). Si eso lo aprendiera una red, los golpes serían injustos o raros.
- **Sí la táctica**: qué hace en cada momento (cada 0,3 s o al acabar un golpe), entre lo que haría alguien que
  pelea de verdad con una vara de dos metros y una esponja de beleño:
  - guardar la distancia de la vara; acercarse; retroceder un paso; rodearte por un lado o por el otro; cortarte la
    salida hacia la puerta o hacia la galería;
  - la vara (barrer, picar), el gancho, la esponja, el sahumerio, la campanilla, la cal; y, en sus otros tiempos,
    la sierra, la lanceta, el trépano, los cauterios;
  - **amagar** (empezar un golpe y no darlo, para que ruedes antes de tiempo), **esperar** (no atacar mientras te
    cubres), **castigar** (cuando bebes, cuando fallas un golpe, cuando te quedas sin aliento).
- **Lo que ve**, como lo vería alguien en esa sala: a qué distancia estás y por qué lado; si atacas, bloqueas,
  ruedas o bebes; si jadeas (tu aguante) o cojeas (tu vida); su propia vida, su tiempo, lo que le falta para volver
  a usar cada cosa; lo que tiene cerca (los muros, la mesa, los camastros, el fuego).
- **Con reflejos de persona**: decide con un cuarto de segundo de retraso sobre lo que ve, y nunca lee el mando. Si
  esquivas bien, es porque has esquivado bien, no porque él haya adivinado tarde.

## 3. Cómo se entrena, y quién

- **No hace falta que lo entrenes tú.** La red es pequeña (unos miles de números) y se entrena aquí, en el
  ordenador de esta sesión, con el procesador, en una o dos horas. Lo que sale es **un archivo de pesos** (unos
  pocos KB, en JSON) que va en el repositorio y dentro del juego, como todo lo demás, y que se ejecuta en el
  navegador en microsegundos: sin servidor, sin tarjeta gráfica y sin internet. En el teléfono, igual.
- **Dónde aprende**: en una copia simplificada de la pelea (la sala, las distancias, los tiempos de cada golpe, el
  aguante, lo que hace cada cosa), que juega miles de peleas por minuto. Lo que aprende se comprueba después en el
  motor de verdad con `tools/fisicopelea.mjs`, y sólo se queda si en el juego también funciona.
- **Contra quién**: contra muchos jugadores de prueba distintos (el agresivo, el cauto, el que desvía, el que bebe a
  cada rato, el que huye y vuelve, el que se queda en la galería...), para que no aprenda a ganarle sólo a uno.
- **Qué se premia**: lo que haría un físico que pelea de verdad: dar sin que le den, no fallar golpes al aire,
  castigar los descuidos, dormirte (que es lo que quiere). Y **se castiga lo que no haría nadie**: girar en el sitio,
  amagar sin parar, quedarse siempre en el límite de la vara, huir de una pelea que va ganando. Las redes que
  aprenden solas encuentran trampas que ningún humano usaría; eso es lo que más hay que vigilar para que sea
  realista.
- **Lo que puedes poner tú: jugar.** Un modo de grabación (Opciones › *Grabar mis peleas*) guardaría lo que haces
  en cada pelea con él, y se exportaría en un archivo que se mete en el repositorio (por ejemplo, `datos/peleas/`).
  Con eso: un jugador de prueba que juega **como tú**, para entrenarle contra ti; y una medida honrada de si ya es más
  difícil o sólo más injusto. Si un día quieres entrenarlo tú en tu ordenador, sería un solo comando
  (`node tools/entrena_fisico.mjs`), sin nada más que instalar.

## 4. Además: la historia clínica (aprende de ti mientras juegas)

Lo más suyo, y lo que más se nota: **apunta tus síntomas**. Durante la caza y la pelea guarda (en tu partida) lo que
haces: hacia qué lado ruedas, si desvías o bloqueas, cuándo bebes, si huyes al verte herido, si subes a los tejados.
Y lo usa: barre hacia donde sueles rodar, amaga si desvías pronto, te echa la cal cuando bebes, te corta la retirada
si siempre huyes. En su mesa, la historia clínica del que no se arrodilló crece con lo que ha apuntado de ti:
«Rueda a su izquierda. Bebe cuando sangra. Huye al tercer golpe.»

Es aprendizaje también (un modelo de ti que se pone al día en cada encuentro), no necesita entrenamiento previo, se
explica solo dentro del juego y encaja con el personaje: un médico que te estudia.

## 5. Lo que recomiendo

1. **La historia clínica, primero**: se nota enseguida, es suya y no depende de nada más.
2. **Luego, la red de sus tácticas**, entrenada aquí contra los jugadores de prueba (y, si quieres, contra tus
   grabaciones), y comprobada en el motor de verdad.
3. **Un mando de dureza** en Opciones (cuánto aprende de ti y cuánto castiga): una red entrenada puede ser brutal.

## 6. Lo que tienes que decidir

1. ¿Empiezo por la historia clínica, por la red entrenada o por las dos a la vez?
2. ¿Quieres grabar tus peleas para que aprenda de cómo juegas tú? (Si sí, pongo el modo de grabación.)
3. ¿Hasta dónde debe castigar? Para un jefe a mitad de una partida de una hora, ¿más difícil que el Caballero de la
   Orden, o menos?
4. ¿Sólo el Físico, o también sus Coronados (que le avisen y te cierren el paso) y, más adelante, otros jefes?
