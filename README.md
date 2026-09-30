# Dawn of Braga · *Amanecer en Braga*

Survival horror medieval en 3D con combate **Soulslike**, ambientado en una Braga ficticia durante la Reconquista.
La ciudad ha caído tras un asedio: los sitiadores respondieron a la llamada de algo que dormía bajo la catedral, y la
corrupción ha deformado a vivos y muertos. Despiertas en una celda del castillo. Tu única meta: **salir de Braga**.

*Dark Souls + Resident Evil 2 + Silent Hill*, en pequeño: un mapa compacto e interconectado, llaves y herramientas
que abren atajos y zonas nuevas, pocos enemigos pero peligrosos, niebla espesa y una estética de juego perdido de
PS1/PS2. Pensado para completarse en **45–60 minutos**.

> Todo el juego se genera por código: geometría, texturas (dibujadas píxel a píxel), iluminación, efectos,
> animaciones, interfaz, sonido y música. No hay ni un solo archivo de imagen, modelo o audio; las únicas piezas
> externas son cinco fuentes pixeladas libres (licencia OFL, en `src/fonts/`), incrustadas en el propio archivo.

## Cómo jugar

- **Versión lista para jugar:** abre `docs/index.html` en un navegador de escritorio (Chrome, Edge o Firefox).
  Es un único archivo autocontenido; también puede publicarse tal cual con GitHub Pages (carpeta `/docs`).
- **Desde el código:**
  ```bash
  npm install
  npm run dev      # servidor de desarrollo en http://localhost:5173
  npm run build    # genera dist/index.html (archivo único)
  ```

Requiere WebGL 2. Se recomienda jugar con mando (XInput) o con teclado y ratón.

## Controles

| Acción | Teclado y ratón | Mando (XInput) |
|---|---|---|
| Moverse | W A S D | Stick izquierdo |
| Cámara | Ratón | Stick derecho |
| Ataque ligero (combo de 3) | Clic izquierdo | RB |
| Ataque pesado | F | RT |
| Bloquear con el escudo | Clic derecho (mantener) | LB |
| Esquivar / correr (mantener) | Espacio | B |
| Correr | Mayús | L3 |
| Fijar objetivo (el enemigo que tienes delante) | Q / clic central | R3 |
| Cambiar de objetivo | Mover el ratón hacia un lado | Stick derecho |
| Beber una ampolla | R | X |
| Interactuar | E | A |
| Inventario y documentos | Tab / I | Y |
| Mapa | M | View |
| Pausa y opciones | Esc | Start |

## Qué hay dentro

**Mundo.** El castillo con su cárcel, su patio de armas y la capilla de la guarnición, la Calle del Soto, la Plaza
del Pan con su fuente, horca (con escalera por la que se sube al cadalso) y picota, la Calle de la Catedral, la Plaza
de la Catedral con la pira, la catedral (nave con arquerías, vidrieras, bancos con fieles muertos), el claustro, la
Calle de los Pellejeros y las curtidurías, la Calle de la Muralla con su adarve y la Torre del Postigo, la Calle de la
Herrería con la fragua (rótulo del yunque, fuego visible desde la calle y taller decorado por dentro), y bajo la
catedral: osario de calaveras, un templo romano de *Bracara Augusta* con mosaicos, el sepulcro del arzobispo y la
cisterna del Dios Desconocido. Al final, las orillas del río Este.

**Los barrios.** Entre las calles principales hay una trama de callejones, pasadizos elevados, soportales y casas
que se pueden visitar por dentro: el Callejón del Pozo y su plazuela (con el pozo bajo un tejadillo a cuatro aguas,
su torno y su cubo), el Callejón del Arco, la Travesía de la Sé, la Taberna del Cuervo, el obrador de la tejedora
(telar y torno de hilar), el patio y el horno de pan (con artesas y hornos de leña), el Callejón de la Fragua, el
patio y el taller de los tintoreros (cubas de tinte y telas tendidas), el corral y el establo de los Pellejeros, y
la cerca de la ciudad cerrando cada barrio. Los altares de descanso están en lugares a salvo: la capilla de la
guarnición, el Oratorio de Santa Bárbara, la Capilla de San Fructuoso y la cripta. Las casas que se pueden visitar
se distinguen desde la calle (faroles encendidos, rótulos, antorchas, la puerta entornada con luz dentro); las de
adorno tienen la puerta cerrada, y algunas clavadas con tablones o atrancadas.

**La Casa del Canónigo.** Una casa-torre de piedra que se reconoce desde las Curtidurías y la Calle de la Muralla:
portada de medio punto con tímpano, escudo pintado con el capelo y sus borlas, balcón de madera, faroles encendidos
a los lados de la puerta entornada y una torre almenada con la ventana alta siempre iluminada. Dentro, el zaguán,
el estudio (la llave del claustro sigue sobre la mesa), la alcoba, la cocina con su hogar y la despensa. Al fondo,
la puerta de la bodega, atrancada por el ama con sal y velas. Desde la casa ya se oye, abajo, algo que mastica.
Al asomarse a la escalera salta una cinemática: el personaje baja los peldaños con el ruido cada vez más cerca; al
pie, la cámara gira por detrás de él y se ve la sala del altar, donde el canónigo, de espaldas, devora un cadáver.
Un hueso cruje bajo la bota, se hace el silencio, la cabeza del revés gira despacio hasta mirarle, el cuerpo se da
la vuelta de golpe, se alza, grita y arroja el cadáver contra la pared. Arriba, a contraluz de una vela, el ama
cierra la puerta de un portazo y echa la tranca («Perdóneme, señor…»). Abajo, la sala vacía; algo la cruza de un
salto y se pierde en la bóveda.

**Las bodegas del canónigo.** Un laberinto de sótanos a oscuras, mucho más grande que la casa de arriba: la sala del
altar con sus pilares, la celda donde el ama encerraba al canónigo, la galería de los toneles con sus estanterías,
el Lagar (una sala enorme y diáfana, con la pila de pisar la uva y la luz pálida que cae por las rejillas de la
calle), la antecámara, la Cripta de los canónigos con sus sepulcros y santos velados, y el osario, con las paredes
de calaveras, que da la vuelta hasta la cripta. Los pasillos forman varios anillos, así que siempre hay otro camino
(para ti y para él). La puerta de arriba queda atrancada; la única salida es el pozo del Postigo, al fondo de la
cisterna vieja, donde el agua negra refleja tu farol. Pero la cisterna la cierra un rastrillo colgado de tres
cadenas, y cada cadena de una palanca: una en el Lagar, otra en la cripta y la última al fondo del ramal ciego del
osario (lo cuenta la orden del canónigo al maestro de obras, en la mano de éste, muerto junto al rastrillo). Echar
una palanca cuesta tiempo y hace ruido: la cadena corre por la bóveda y él la oye desde cualquier rincón. Con las
tres echadas, el rastrillo sube y se puede trepar por los pates del pozo hasta la calle (y, una vez descubierto,
volver a bajar por él). Los pilares aguantan un par de embestidas antes de venirse abajo, y las estanterías se
parten en astillas. Cada vez que vuelves a bajar, alguien cierra de un portazo allá arriba.

**Una ciudad viva… de otra manera.** Bandadas de cuervos que picotean a los muertos y alzan el vuelo graznando al
acercarte, ratas que huyen por los rincones, moscas zumbando sobre los cadáveres, ropa tendida entre las casas,
rótulos de tienda, faroles, armas caídas, maniquíes y dianas en el patio de armas, estacas, círculos rituales,
piedras de catapulta y una pasada automática que acumula piedras, tejas, tablas, paja, trapos, huesos y hierbajos al
pie de todos los muros. Los crecimientos de carne nacen pegados al suelo y a las paredes y trepan por ellas.

**Progresión (metroidvania / survival horror).** Barricadas que se arrancan con la palanca, una mesa atravesada en
la cocina de la Taberna del Cuervo que se parte en dos de un golpe (acércate y pulsa E), la verja del claustro,
puertas atrancadas que solo se abren desde dentro (atajos), una reja que necesita la manivela del rastrillo, un
sello que exige el anillo del arzobispo, altares de descanso que curan, rellenan las ampollas y devuelven a las
criaturas a sus puestos. Las puertas atrancadas muestran la tranca por el lado desde el que se quita. Mejoras
opcionales: ampollas vacías, relicarios de hueso (vitalidad), una piedra de afilar bendita (daño) y el rosario del
canónigo (aguante), que deja el Descoyuntado al morir. Diecisiete documentos breves cuentan la historia junto con el
escenario.

**Combate Soulslike simplificado.** Ataque ligero en combo, ataque pesado que rompe guardias, ataque a la carrera,
bloqueo con coste de aguante (y rotura de guardia), esquiva con fotogramas de invulnerabilidad, curación con
animación, *hitstop*, golpes críticos, estela de la espada, retroceso y estremecimiento de las criaturas, aviso en
los ojos antes de sus golpes, vibración del mando, *poise*, un *buffer* de entradas y cancelación de la recuperación
al moverse. El fijado elige al enemigo que tienes delante (con línea de visión) y la cámara lo encuadra con un
barrido suave, sin saltos. Bajo techos bajos y vigas la cámara se agacha en vez de atravesarlos.

**Animación procedural.** Clips con interpolación de Hermite y mezcla por cuaterniones, marcha bípeda con zancada
ajustada a la velocidad, balanceo de cadera, inclinación en las curvas y cinemática inversa de dos huesos en piernas
(los pies se apoyan en el suelo y en los escalones) y brazos; los escudos se estabilizan para mirar siempre al frente.
El brazo del escudo lo lleva con soltura (muelles de guiñada, cabeceo y alabeo, y mezcla de las poses de guardia,
marcha y carrera) y, si aun así fuera a meterse en el torso, la hombrera, la cadera o la pierna, se aparta; al trotar
y correr la hoja va por delante.

**Armas.** Cinco armas, cada una con su modelo, su estela, sus sonidos y su repertorio completo (combo ligero,
pesado, ataque a la carrera, ataque al salir de la voltereta, guardia, bloqueo y curación). Por el orden en que se
encontrarán:
- **Facón criollo** (una mano, con escudo): agazapado, cuatro cortes cortos que se encadenan (tajo, revés con el
  contrafilo, tajo corrido y puñalada), molinete de dos tajos y puñalada a fondo; hiere más por la espalda.
- **Hacha barbada** (dos manos, el escudo a la espalda; se para con el mango): golpes lentos y demoledores que
  desequilibran a casi cualquiera, barrido con las manos deslizándose por el mango y un hachazo del verdugo que se
  carga manteniendo el botón, rompe la guardia y parte el suelo con una onda.
- **Lanza de la muralla** (una mano, con escudo): estocadas largas y rectas, un barrido con el asta y una estocada
  que se lanza sin bajar el escudo.
- **Espada del carcelero**: la de siempre, sin cambios.
- **Katana sagrada** (dos manos): kesa-giri, kiriage, corte horizontal y tsuki; *iaijutsu* (desenvaina de la saya
  al cinto y corta en un gesto, con destello sagrado; también se carga) y un *makko* vertical.

Las cuatro nuevas ya están en los datos (objetos, iconos, modelo recogible; al recogerlas se empuñan y el arma
queda guardada en la partida) pero aún no están colocadas en el mundo. Para probarlas: `?dev=1&arma=facon`
(o `hacha`, `lanza`, `espada`, `katana`).

Sus animaciones siguen la estructura de un golpe real: anticipación que frena, impacto que se cruza a la velocidad
máxima y final del tajo que frena desde ahí (una sola campana de velocidad, sin paradas ni rebotes: tangentes
monótonas), con retrasos escalonados de cadera, pecho, brazo y hoja. El filo va por delante: el giro de la muñeca
se calcula fotograma a fotograma a lo largo del arco real de la hoja (sin medias vueltas bruscas cuando la hoja se
alinea con el antebrazo) y el codo se elige para que la muñeca quede natural. Las estocadas se definen en el espacio del personaje para ir rectas aunque el torso gire; a dos
manos, el puño izquierdo se coloca exactamente sobre el mango (y se desliza por él si el brazo no llega). Las
ventanas de golpe salen del perfil de velocidad de la punta y cada golpe del combo empieza en la pose exacta en que
se encadena el anterior.

**Criaturas.**
- **Penitente**: flagelante encapuchado, con clavos en la espalda y una hoz oxidada.
- **Soldado cosido**: yelmo reventado por la carne y un tercer brazo que brota de la espalda; bloquea con el escudo.
- **Rastrero**: cuerpo supino que camina a cuatro patas como una araña; embosca desde los techos.
- **Mastín desollado**: perro sin piel con la mandíbula abierta; caza en pareja.
- **Campanero**: bruto de 2,6 m con una campana fundida en la cabeza; su tañido aturde.
- **Plañidera**: figura velada que flota y lanza lamentos espectrales.
- **El Empalado** (jefe menor): un gigante atravesado por una pica que carga contra ti.
- **El Descoyuntado** (jefe opcional, en las bodegas del canónigo): el canónigo, boca arriba sobre cuatro miembros
  descoyuntados, con la sotana hecha jirones, la cabeza del revés y la mandíbula suelta. Su cuerpo es procedural:
  cada miembro es una cadena de dos huesos con cinemática inversa y pies que se plantan en el suelo o en el techo y
  sólo se despegan cuando se estiran demasiado; tiene tres andares (al acecho, bajo y con pausas; al paso, en
  diagonal; y al galope), el tronco en dos mitades que se tuercen y se doblan, costillas que respiran, dedos que se
  cierran y se abren, jirones que cuelgan siempre hacia el suelo (también boca abajo, en el techo) y una cabeza que
  escudriña, se tuerce sola y tiembla de rabia. Cada golpe tiene preparación, golpe y recuperación con inercia:
  zarpazo, doble zarpazo, barrido bajo, las dos manos contra el suelo (onda de choque), mordisco con el cuello
  estirado, salto, carga al galope, giro con los brazos abiertos, agarrón con mordiscos (se forcejea para soltarse),
  el crujido de todas sus articulaciones y huesos lanzados; esquiva con voltereta hacia atrás, salto atrás o de
  lado, para tus golpes con los antebrazos cruzados y contraataca, cae de espaldas pataleando cuando se estrella y
  muere a pedazos (se le parten los miembros uno a uno y, al final, la cabeza se le da la vuelta).
  Primero **acecha**: te observa desde la bóveda, se asoma por las esquinas, se mete en las madrigueras de los
  muros, imita tus pasos y la voz del ama, se ríe y te tira huesos, y te embosca cuando le das la espalda, te curas,
  lees o echas una palanca. Tras cada emboscada se queda a pelear un rato. Cada emboscada que le sale mal (la
  esquivas, la paras, le ves venir, le hieres, te sueltas de su agarrón) le frustra; cuando se harta, cuando le has
  hecho bastante daño o cuando echas la tercera palanca, **enloquece**: viene a por ti, se alza, grita y golpea el
  suelo, y ya no se esconde; tus golpes le hacen la mitad de daño. Enloquecido prefiere pelear en sitios abiertos
  (si te metes en un pasillo, se aparta a lo ancho y te espera golpeando el suelo) y te lee: aprende qué haces y qué
  sueles hacer después de qué, cuántos golpes tienen tus combos y hacia dónde ruedas cuando te ataca, y lo usa para
  apartarse de un salto cuando vas a golpear y castigarte en la recuperación, cruzar los brazos para parar el resto
  de un combo que ya conoce, adelantarse con un mordisco cuando sabe que vas a atacar y apuntar su segundo zarpazo
  adonde sueles esquivar. Con poca vida entra en frenesí. Su barra sólo aparece cuando pelea contigo.
- **El Turiferario** (jefe final): el arzobispo transfigurado, con una corona de velas y un incensario gigante
  simulado físicamente como un péndulo en llamas; segunda fase con lluvia de ascuas y charcos de fuego.

**Estética PS1/PS2 hecha a mano con shaders.** Render a baja resolución con escalado entero *nearest*, vértices
ajustados a la rejilla de pantalla y mapeo afín opcionales (por defecto desactivados para que el suelo no tiemble),
filtrado anisótropo, color de 15 bits con tramado Bayer, niebla que se funde con el color del cielo, niebla
exponencial más niebla volumétrica por *raymarching* (bancos que se arrastran por las calles), *bloom* de fuego,
iluminación horneada por vértice (antorchas, velas, vidrieras) combinada con un pool de luces dinámicas
parpadeantes, ceniza cayendo, brasas, humo, sangre, sombras de mancha, filtro CRT opcional y siluetas en la niebla.

**Interfaz en pixel art.** Todos los menús se dibujan con sprites generados por código a resolución de arte y
escalado entero: marcos de hierro con esquineras doradas, estandartes carmesí con espadas como cursor, una gran espada
en la portada, pergamino rasgado con capitular iluminada y lacre para los documentos, iconos 32×32, mapa sobre
pergamino, teclas dibujadas y un HUD pintado píxel a píxel. El texto usa fuentes pixeladas (Jacquarda Bastarda 9,
Handjet, Silkscreen y Jacquard) siempre a múltiplos exactos de su rejilla para que se vea nítido.

**Música adaptativa, compuesta por código.** Cada zona tiene su tema, con su modo, tempo e instrumentos, y tres
capas que se funden según lo que pasa: exploración, tensión (clúster de cuerdas en trémolo, latido y susurros cuando
algo acecha) y combate (tambores de guerra, pandero, metales y ostinato cuando te persiguen). Las calles suenan en
mi frigio con dron grave, coro lejano, zanfona y salterio; la muralla, con cuernos y los tambores de los sitiadores
al otro lado; las casas, con una caja de música olvidada; las capillas con altar, con órgano de flautado y un coro
en paz (ahí no entra la tensión); la catedral, con órgano lleno y canto gregoriano; la cripta, con drones sordos y
coros disonantes. El Empalado tiene su propia percusión de guerra en frigio dominante (más rápida en la segunda
fase); el Descoyuntado, la caja de música de las casas rota y desafinada sobre tambores en 7/8, chasquidos de hueso
y un coro que salmodia en una sola nota (y, mientras te caza, un latido lento en 7/8 con la caja de música a medio
sonar, clústeres de cuerda y susurros), y el Turiferario, un órgano de lengüetería y un coro que canta el *Dies
irae*. La portada es canto llano en
*organum* con campanas y el amanecer, un coro y un arpa en mayor. Hay golpes de efecto al ser descubierto, al
descubrir una zona, al descansar, al cruzar la niebla, al morir y al vencer. Los instrumentos se sintetizan en
directo: órgano con registros, coro con formantes, cuerdas, zanfona, metales, salterio y arpa por Karplus-Strong,
campanas aditivas y tambores.

**Sonido 100 % sintetizado (WebAudio).** Reverberación por convolución con salas generadas (calle, habitación,
capilla, catedral, cripta, exterior) que se funden al pasar de una a otra; sonidos 3D con absorción del aire por
distancia y oclusión (lo que suena tras un muro llega apagado); pisadas según el suelo (piedra, madera, tierra) con
el tintineo de la cota de malla y golpe al aterrizar; filos que silban, carne, hueso, escudos y metal; puertas que
chirrían, cerrojos, trancas, tablones, rejas con cadenas y la losa del sello; voces de criaturas con formantes,
aspereza y temblor (rezos que se oyen antes de que te vean, jadeos, sollozos, gritos); ambiente por capas (viento a
rachas y silbando en las almenas, el rumor de la ciudad en llamas, fuegos posicionales, moscas, el acorde cálido de
los altares, el río) y sucesos de cada zona (campanas lejanas, gritos, perros, vigas que se desploman, procesiones,
cuernos, ratas, gotas en la cripta, pasos que no son tuyos en la catedral, pájaros al amanecer). La música se atenúa
con los golpes fuertes y se oye «tras una puerta» en la pausa.

## Estructura del código

```
src/
  main.js               arranque y bucle
  core/                 entrada (teclado/ratón/mando), utilidades, ruido y audio:
                        audio.js (mezcla, efectos, ambiente), audio_music.js (música adaptativa),
                        audio_lib.js (síntesis: salas, cuerdas pulsadas, campanas, tambores)
  gfx/                  texturas procedurales, materiales PSX, post-proceso, efectos, geometría fusionada
                        y agua (water.js: la cisterna y el pozo)
  world/                colisión, rejilla transitable, arquitectura, atrezo, detritos y el mapa de Braga
                        (level_canon.js: la Casa del Canónigo; level_cellar.js: el laberinto de sus bodegas,
                        generado por regiones: suelos, bóvedas, muros, pilares, madrigueras, posaderos,
                        palancas y el rastrillo)
  entities/             rig articulado + animador, locomoción con IK, jugador, criaturas e IA
                        (el Descoyuntado: descoyuntado.js, el cuerpo; desc_moves.js, golpes, esquivas y
                        guardia; desc_mind.js, el acecho, la furia y lo que aprende de ti); armas:
                        weapons.js (registro y clips comunes), weapon_moves.js (golpes del facón, el
                        hacha, la lanza y la katana), weapon_models.js (modelos) y weapon_common.js (agarre)
  game/                 juego, combate, interacción, cámara, atmósfera, fauna, navegación A*, interfaz,
                        iconos, guardado, textos y cinemáticas (cutscene.js: la de la bodega; hunt.js: la caza
                        en las bodegas; breakables.js: pilares y estanterías que se rompen)
  ui/                   motor de sprites pixel art de la interfaz y su hoja de estilos
  fonts/                fuentes pixeladas (OFL) y su licencia
tools/                  pruebas automatizadas con Playwright (requieren `npx vite --port 5199`):
                        progress.mjs   recorre toda la progresión hasta el final
                        fuzz.mjs       prueba de estrés con entradas aleatorias
                        holes.mjs      busca zonas transitables sin suelo visible
                        freecam.mjs    capturas con cámara libre
                        uishots.mjs    capturas de todas las pantallas de la interfaz
                        posesheet.mjs  hoja de poses de las animaciones (ARMA=..., GHOST=s dibuja el arco)
                        weapontest.mjs cada arma en el juego: combo, pesado cargado, carrera, voltereta,
                                       bloqueo y curación contra un enemigo real
                        animcheck.mjs  (sin navegador) análisis numérico de los golpes: velocidad de la punta,
                                       filo por delante, agarre a dos manos, tirones y saltos al encadenar
                        gearcheck.mjs  escudo y hoja frente al cuerpo al andar, correr, girar y bloquear:
                                       cuánto se meten en el torso o las piernas y hacia dónde apunta la hoja
                        audiotest.mjs  renderiza sin altavoces cada tema, efecto y ambiente y mide niveles
                        audiobench.mjs coste de CPU del audio
                        huntsim.mjs    simula la caza del Descoyuntado sin dibujar (segundos y un jugador
                                       robot: still, wander, fight, levers o escape) y resume sus modos,
                                       cuándo enloquece, qué aprende, lo que te lee y lo que rompe
                        bossanim.mjs   hojas de fotogramas de cada movimiento del Descoyuntado
                        cellar.mjs     comprueba que el pozo sólo se alcanza por el rastrillo y hace capturas
                                       de cada sala de las bodegas
                        boss.mjs       capturas del Descoyuntado en posiciones y cámaras dadas
                        cine.mjs       fotogramas de la cinemática de la bodega en los segundos pedidos
```

El progreso se guarda automáticamente en el navegador (`localStorage`) al descansar, abrir pasos y recoger objetos.
