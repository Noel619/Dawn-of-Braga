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

**Los barrios.** Entre las calles principales hay una trama de callejones, pasadizos elevados, soportales y
casas que se pueden visitar por dentro: el Callejón del Pozo y su plazuela, el Callejón del Arco, la Travesía de la
Sé, la Taberna del Cuervo, el obrador de la tejedora (telar y torno de hilar), el patio y el horno de pan (con
artesas y hornos de leña), el Callejón de la Fragua, el patio y el taller de los tintoreros (cubas de tinte y telas
tendidas), el corral y el establo de los Pellejeros, y la cerca de la ciudad cerrando cada barrio. Los altares de
descanso están en lugares a salvo: la capilla de la guarnición, el Oratorio de Santa Bárbara, la Capilla de San
Fructuoso y la cripta.

**Una ciudad viva… de otra manera.** Bandadas de cuervos que picotean a los muertos y alzan el vuelo graznando al
acercarte, ratas que huyen por los rincones, moscas zumbando sobre los cadáveres, ropa tendida entre las casas,
rótulos de tienda, faroles, armas caídas, maniquíes y dianas en el patio de armas, estacas, círculos rituales,
piedras de catapulta y una pasada automática que acumula piedras, tejas, tablas, paja, trapos, huesos y hierbajos al
pie de todos los muros. Los crecimientos de carne nacen pegados al suelo y a las paredes y trepan por ellas.

**Progresión (metroidvania / survival horror).** Barricadas que se arrancan con la palanca, una mesa atravesada en
la cocina de la Taberna del Cuervo que se parte en dos de un golpe (acércate y pulsa E), la verja del claustro,
puertas atrancadas que solo se abren desde dentro (atajos), una reja que necesita la manivela del rastrillo, un
sello que exige el anillo del arzobispo, altares de descanso que curan, rellenan las ampollas y devuelven a las
criaturas a sus puestos. Mejoras opcionales: ampollas vacías, relicarios de hueso (vitalidad) y una piedra de
afilar bendita (daño). Doce documentos breves cuentan la historia junto con el escenario.

**Combate Soulslike simplificado.** Ataque ligero en combo, ataque pesado que rompe guardias, ataque a la carrera,
bloqueo con coste de aguante (y rotura de guardia), esquiva con fotogramas de invulnerabilidad, curación con
animación, *hitstop*, golpes críticos, estela de la espada, retroceso y estremecimiento de las criaturas, aviso en
los ojos antes de sus golpes, vibración del mando, *poise*, un *buffer* de entradas y cancelación de la recuperación
al moverse. El fijado elige al enemigo que tienes delante (con línea de visión) y la cámara lo encuadra con un
barrido suave, sin saltos.

**Animación procedural.** Clips con interpolación de Hermite y mezcla por cuaterniones, marcha bípeda con zancada
ajustada a la velocidad, balanceo de cadera, inclinación en las curvas y cinemática inversa de dos huesos en piernas
(los pies se apoyan en el suelo y en los escalones) y brazos; los escudos se estabilizan para mirar siempre al frente.

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
fase) y el Turiferario, un órgano de lengüetería y un coro que canta el *Dies irae*. La portada es canto llano en
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
  world/                colisión, rejilla transitable, arquitectura, atrezo, detritos y el mapa de Braga
  entities/             rig articulado + animador, locomoción con IK, jugador, criaturas e IA; armas:
                        weapons.js (registro y clips comunes), weapon_moves.js (golpes del facón, el
                        hacha, la lanza y la katana), weapon_models.js (modelos) y weapon_common.js (agarre)
  game/                 juego, combate, interacción, cámara, atmósfera, fauna, navegación A*, interfaz,
                        iconos, guardado y textos
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
                        audiotest.mjs  renderiza sin altavoces cada tema, efecto y ambiente y mide niveles
                        audiobench.mjs coste de CPU del audio
```

El progreso se guarda automáticamente en el navegador (`localStorage`) al descansar, abrir pasos y recoger objetos.
