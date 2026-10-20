# Los osarios, los objetos benditos y la cripta honda, otra vez

Plan de diseño y de trabajo, empezado el 20 de octubre de 2026, a partir de lo que pidió el autor tras jugar
la cripta honda:

- **El osario de San Martín** era una caja con la misma textura de calaveras en todas las paredes y unas
  calaveras puestas de cualquier manera. No tenía función en el juego.
- **Los osarios** tienen que guardar **objetos benditos**, protegidos por un **puzle** (una caja con
  mecanismo o algo así). Cada osario, con **su propia personalidad**. El de San Martín da uno de los más
  fuertes.
- **Muy importante:** los objetos benditos **favorecen un estilo de juego**, no suben números a secas («ataque
  +50 %», no). Cada uno da y quita: más velocidad de golpe a cambio de peor parry, cosas así.
- La cripta de San Martín tenía un fallo visual en los arcos (**hecho**: sobre cada capitel de las arquerías
  quedaba una rendija negra; ver `archRing`, opción `piers`).
- **Las notas** llevan su **transcripción** a la derecha, como en Resident Evil, con un botón que la muestra y
  la oculta (**hecho**: T en el teclado, X en el mando, y en Opciones).
- **La Sala de los Obispos** era la peor sala: enorme, vacía, columnas y tumbas sin contexto, mal conector y
  sin personalidad; y en su paso a San Martín unas tumbas tapaban el camino.
- **La espectacularidad** que se pidió para las salas no estaba.
- **Las catacumbas del lucernario** eran piedra, sí, pero bajísimas, cuadradas, sin personalidad, sin
  espectáculo, y con un agua plana que lo empeoraba.
- **Criaturas nuevas** para la cripta honda (tres, con modelos a la altura del Campanero y la Plañidera): no
  pueden ser las mismas de la ciudad de arriba.
- Y una pasada por los **fallos visuales** de otras zonas.

## 1. Los objetos benditos

Reliquias que se encuentran en los osarios. **Se lleva una a la vez** (las reliquias son celosas: dos santos
no comparten un mismo cuerpo); se pone y se quita en el inventario, en cualquier momento. Cada una favorece
una manera de pelear —las cuatro defensas del juego: parar, esquivar, aguantar golpeando y desviar— y
castiga otra. El número de huecos es una constante (`RELIC_SLOTS`, en `game/relics.js`) por si un día se
quieren dos.

| Osario | Objeto | Estilo | A favor | En contra |
|---|---|---|---|---|
| Castillo (catacumbas) | **Saeta de San Sebastián** | La guardia | Bloquear cuesta la mitad de aguante; con la guardia alzada el aguante se recupera como sin ella; lo que paras no te hiere; tras parar un golpe, el siguiente tuyo hace +50 % | Las volteretas cuestan el doble y llegan más corto; la ventana del parry, −40 % |
| Bodegas del canónigo | **Escapulario del ama** | La esquiva | Voltereta invulnerable más tiempo (×1,5) y un 40 % más barata; correr gasta la mitad; esquivar en el último instante ralentiza el tiempo y tu siguiente golpe es crítico | Vitalidad máxima −30 %; bloquear cuesta un 50 % más |
| Cripta de la Sé | **Óbolo de las Ánimas** | Aguantar golpeando | La vida que te quitan queda unos segundos en el aire y, golpeando, la recuperas; golpes un 15 % más rápidos | Las ampollas curan la mitad; recibes un 15 % más de daño |
| San Martín | **Cerrojo de San Martín** | El desvío | Ventana del parry +60 %; cada parry te devuelve todo el aguante; las criaturas grandes y los jefes necesitan un parry menos para quedar desequilibrados y lo quedan un 40 % más; el golpe de gracia hace el doble | No puedes bloquear: la guardia sólo sirve para desviar |

El del Cerrojo es el más fuerte: con él, quien sabe desviar desmonta casi cualquier pelea; quien no, se queda
sin escudo.

## 2. Los cuatro osarios y sus puzles

Cada uno con su gente, su manera de ordenar los huesos, su mecanismo y su pista (un documento).

1. **El osario de la guarnición** (catacumbas del castillo). Los muertos de la Hermandad de la Buena Muerte,
   la cofradía de los soldados: huesos ordenados como en un cuartel, yelmos sobre calaveras, escudos y
   armas. *Puzle: el toque de alba.* Cuatro yelmos colgados sobre el altar, cada uno con lo suyo debajo: una
   llave, una ballesta, una bocina y un cubo. Se golpean en el orden en que se pasa lista («primero el que
   abre la puerta, luego el que vela en el muro, luego el que avisa desde lo alto y al final el que baja a por
   el agua»); cada uno suena con su nota y enciende su vela. Uno fuera de orden, y se apagan todas. Con los
   cuatro, se descorre la barra del arca de la Hermandad.
2. **El osario de los canónigos** (bodegas del canónigo). La locura del canónigo: calaveras vueltas hacia el
   techo, MÁS ABAJO arañado en la piedra, los círculos de sal del ama. *Puzle: la nana del ama.* Una caja de
   música con cuatro rodillos, cada uno con una luna, una estrella, un gallo y un sol: hay que dejar la nana
   que el ama le cantaba de niño y darle cuerda. Cada vuelta y cada prueba **suenan por toda la bodega**:
   mientras viva el Descoyuntado, viene a ver qué pasa. Acertada, la caja toca la nana entera y se abre su
   cajón.
3. **El osario de las ánimas** (cripta de la Sé). Los canónigos de la catedral: en la boca de cada calavera
   de los nichos, un óbolo para las ánimas; bajo cada nicho, el nombre del muerto, salvo en tres. Al fondo,
   el retablo de las ánimas con su cepillo. *Puzle: las ánimas olvidadas.* Hay que llevar al cepillo los
   óbolos de los que nadie nombra; si coges el de uno que tiene nombre, el muerto lo reclama y lo que llevas
   vuelve a su sitio.
4. **El osario de los hermanos de Dumio** (cripta de San Martín). Los monjes que cavaron con Martín,
   **de pie en sus nichos, vestidos con su hábito**, bajo arcos de herradura de fémures, una lámpara de huesos
   y la inscripción LO QVE TV ERES FVIMOS; LO QVE SOMOS SERAS. *Puzle: la mirada de los hermanos.* Cuatro
   monjes con lo suyo en las manos (un farol, un libro, un pico y un reloj de arena): a cada uno se le vuelve
   la cara hacia lo que guarda (la puerta, la inscripción, la fosa abierta, el arca). Con los cuatro en su
   sitio, se les encienden los ojos y el mecanismo de huesos del arca se abre.

Los muros de los osarios dejan de ser la misma textura: cada uno tiene su aparejo (fémures apilados,
calaveras en hileras, rosetones de huesos) y piezas de verdad delante (hileras de calaveras, arcos de huesos,
lámparas, cruces).

## 3. La cripta honda

- **El Panteón de los Obispos** sustituye a la Sala de los Obispos: una **rotonda** (redonda, no un cuadrado),
  con un deambulatorio alrededor, un anillo de columnas, una cúpula pintada de estrellas y, colgada en medio,
  **la corona de luz** (una rueda de hierro con sus torres y sus velas, como las de las catedrales
  románicas). En el centro, **el pozo de los obispos**: el suelo se hunde hasta el nivel de las catacumbas,
  con sus sepulcros en las paredes y el del primer obispo en el fondo; se baja por una escalera y desde el
  fondo se sigue a las catacumbas. **Cada salida tiene su luz**, y se ven todas desde la entrada: oro hacia
  San Martín, rojo hacia la antesala (por una gran reja), azul frío hacia las catacumbas.
- Entre el panteón y San Martín, **la galilea**: un vestíbulo con los tres arcos de herradura. **Fuera las
  tumbas que tapaban el paso.**
- **Las catacumbas de la Sé**: más altas, de roca de verdad (muros y bóvedas irregulares, no cajas), con
  nichos en muchas alturas, y **el lucernario** convertido en lo que es: un pozo de luz alto por el que cae
  el día sobre **un estanque de agua viva** (ondas, reflejos, gotas, la mancha de luz rota por el agua), con
  el oratorio de San Pedro de Rates en lo alto.
- **Tres criaturas nuevas** (ver 4) en vez de las de la ciudad.

## 4. Las criaturas de la cripta honda

1. **El Cavador** — un hermano de Dumio: un esqueleto alto y encorvado con el hábito podrido, la capucha,
   un farolillo al cinto y un pico. Se le oye antes de verle: cava. Golpe de pico de arriba abajo (se le
   queda clavado), barrido y arremetida.
2. **La Emparedada** — una muerta de los lóculos, envuelta en vendas, con un **retrato pintado** atado sobre
   la cara (como los de las momias romanas): espera dentro de su nicho, con la cara pintada mirando, y sale
   de la pared cuando pasas. Se arrastra a cuatro patas, se alza para arañar y se te echa encima.
3. **El Enrodado** — un mártir con el cuerpo roto y trenzado en una rueda de tormento, con sus garfios
   colgando: rueda. Embiste rodando, se vuelca sobre ti y barre con los garfios.

## 5. Plan de trabajo

1. Los objetos benditos: datos, efectos en el jugador y el combate, inventario (llevar / quitar), un icono en
   el HUD, guardado y modo de pruebas.
2. Los cuatro osarios, cada uno con su sala, su mecanismo (`game/ossuaries.js`), su pista y su objeto.
3. El Panteón de los Obispos y la galilea; San Martín sin tumbas en el paso.
4. Las catacumbas y el lucernario.
5. Las tres criaturas (modelo, animaciones, golpes, voces) y su reparto por la cripta honda.
6. La pasada de fallos visuales.
7. Comprobaciones (`progress.mjs`, `cryptwalk.mjs`, `camclip.mjs`, `holes.mjs`, capturas), el README al día
   y la versión jugable.
