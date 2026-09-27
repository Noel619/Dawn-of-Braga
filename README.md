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

**Mundo.** El castillo con su cárcel y su patio de armas, la Calle del Soto, la Plaza del Pan con su fuente, horca
y picota, la Calle de la Catedral, la Plaza de la Catedral, la catedral (nave con arquerías, vidrieras, bancos con
fieles muertos), el claustro, la Calle de los Pellejeros y las curtidurías, la Calle de la Muralla con su adarve y la
Torre del Postigo, la Calle de la Herrería con la fragua, y bajo la catedral: osario de calaveras, un templo romano
de *Bracara Augusta* con mosaicos, el sepulcro del arzobispo y la cisterna del Dios Desconocido. Al final, las
orillas del río Este.

**Una ciudad viva… de otra manera.** Bandadas de cuervos que picotean a los muertos y alzan el vuelo graznando al
acercarte, ratas que huyen por los rincones, moscas zumbando sobre los cadáveres, ropa tendida entre las casas,
rótulos de tienda, faroles, armas caídas, maniquíes y dianas en el patio de armas, estacas, círculos rituales,
piedras de catapulta y una pasada automática que acumula piedras, tejas, tablas, paja, trapos, huesos y hierbajos al
pie de todos los muros. Los crecimientos de carne nacen pegados al suelo y a las paredes y trepan por ellas.

**Progresión (metroidvania / survival horror).** Barricadas que se arrancan con la palanca, la verja del claustro,
puertas atrancadas que solo se abren desde dentro (atajos), una reja que necesita la manivela del rastrillo, un
sello que exige el anillo del arzobispo, altares de descanso que curan, rellenan las ampollas y devuelven a las
criaturas a sus puestos. Mejoras opcionales: ampollas vacías, relicarios de hueso (vitalidad) y una piedra de
afilar bendita (daño). Diez documentos breves cuentan la historia junto con el escenario.

**Combate Soulslike simplificado.** Ataque ligero en combo, ataque pesado que rompe guardias, ataque a la carrera,
bloqueo con coste de aguante (y rotura de guardia), esquiva con fotogramas de invulnerabilidad, curación con
animación, *hitstop*, golpes críticos, estela de la espada, retroceso y estremecimiento de las criaturas, aviso en
los ojos antes de sus golpes, vibración del mando, *poise*, un *buffer* de entradas y cancelación de la recuperación
al moverse. El fijado elige al enemigo que tienes delante (con línea de visión) y la cámara lo encuadra con un
barrido suave, sin saltos.

**Animación procedural.** Clips con interpolación de Hermite y mezcla por cuaterniones, marcha bípeda con zancada
ajustada a la velocidad, balanceo de cadera, inclinación en las curvas y cinemática inversa de dos huesos en piernas
(los pies se apoyan en el suelo y en los escalones) y brazos; los escudos se estabilizan para mirar siempre al frente.

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

**Sonido 100 % sintetizado (WebAudio).** Campanas con parciales inarmónicos, voces de criaturas con formantes,
viento, crepitar de fuego posicional, graznidos de cuervo, zumbido de moscas, goteos en la cripta, susurros y estática que crecen cuando algo se acerca,
latido con poca vida, reverberación generada y música procedural (canto llano en modo frigio, percusión de jefe,
coro del amanecer).

## Estructura del código

```
src/
  main.js               arranque y bucle
  core/                 entrada (teclado/ratón/mando), audio sintetizado, utilidades y ruido
  gfx/                  texturas procedurales, materiales PSX, post-proceso, efectos, geometría fusionada
  world/                colisión, rejilla transitable, arquitectura, atrezo, detritos y el mapa de Braga
  entities/             rig articulado + animador, locomoción con IK, jugador, criaturas e IA
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
                        posesheet.mjs  hoja de poses de las animaciones
```

El progreso se guarda automáticamente en el navegador (`localStorage`) al descansar, abrir pasos y recoger objetos.
