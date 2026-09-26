# Dawn of Braga · *Amanecer en Braga*

Survival horror medieval en 3D con combate **Soulslike**, ambientado en una Braga ficticia durante la Reconquista.
La ciudad ha caído tras un asedio: los sitiadores respondieron a la llamada de algo que dormía bajo la Sé, y la
corrupción ha deformado a vivos y muertos. Despiertas en una celda del castillo. Tu única meta: **salir de Braga**.

*Dark Souls + Resident Evil 2 + Silent Hill*, en pequeño: un mapa compacto e interconectado, llaves y herramientas
que abren atajos y zonas nuevas, pocos enemigos pero peligrosos, niebla espesa y una estética de juego perdido de
PS1/PS2. Pensado para completarse en **45–60 minutos**.

> Todo el juego se genera por código: geometría, texturas (dibujadas píxel a píxel), iluminación, efectos,
> animaciones, sonido y música. No hay ni un solo archivo de imagen, modelo o audio.

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
| Fijar objetivo | Q / clic central | R3 |
| Cambiar de objetivo | Mover el ratón | Stick derecho |
| Beber una ampolla | R | X |
| Interactuar | E | A |
| Inventario y documentos | Tab / I | Y |
| Mapa | M | View |
| Pausa y opciones | Esc | Start |

## Qué hay dentro

**Mundo.** Castelo y su cárcel, Rua do Souto, Praça do Pão con su chafariz, horca y picota, Rua da Sé, Largo da Sé,
la catedral (nave con arquerías, vidrieras, bancos con fieles muertos), el claustro, las curtidurías, la muralla
oriental con su adarve y la torre del Postigo, la fragua, y bajo la Sé: osario de calaveras, un templo romano
de *Bracara Augusta* con mosaicos, el sepulcro del arzobispo y la cisterna del Dios Desconocido.

**Progresión (metroidvania / survival horror).** Barricadas que se arrancan con la palanca, la verja del claustro,
puertas atrancadas que solo se abren desde dentro (atajos), una reja que necesita la manivela del rastrillo, un
sello que exige el anillo del arzobispo, altares de descanso que curan, rellenan las ampollas y devuelven a las
criaturas a sus puestos. Mejoras opcionales: ampollas vacías, relicarios de hueso (vitalidad) y una piedra de
afilar bendita (daño). Diez documentos breves cuentan la historia junto con el escenario.

**Combate Soulslike simplificado.** Ataque ligero en combo, ataque pesado que rompe guardias, bloqueo con coste de
aguante (y rotura de guardia), esquiva con fotogramas de invulnerabilidad, curación con animación, fijado de
objetivo, aguante, *hitstop*, vibración del mando, *poise* de enemigos y un *buffer* de entradas.

**Criaturas.**
- **Penitente**: flagelante encapuchado, con clavos en la espalda y una hoz oxidada.
- **Soldado cosido**: yelmo reventado por la carne y un tercer brazo que brota de la espalda; bloquea con el escudo.
- **Rastrero**: cuerpo supino que camina a cuatro patas como una araña; embosca desde los techos.
- **Mastín desollado**: perro sin piel con la mandíbula abierta; caza en pareja.
- **Campanero**: bruto de 2,6 m con una campana fundida en la cabeza; su tañido aturde.
- **Plañidera**: figura velada que flota y lanza lamentos espectrales.
- **El Empalado** (jefe menor): un gigante atravesado por una pica que carga contra ti.
- **O Turiferario** (jefe final): el arzobispo transfigurado, con una corona de velas y un incensario gigante
  simulado físicamente como un péndulo en llamas; segunda fase con lluvia de ascuas y charcos de fuego.

**Estética PS1/PS2 hecha a mano con shaders.** Render a baja resolución con escalado *nearest*, vértices ajustados a
la rejilla de pantalla (temblor), mapeo de texturas parcialmente afín, color de 15 bits con tramado Bayer, niebla
exponencial más niebla volumétrica por *raymarching* (bancos que se arrastran por las calles), *bloom* de fuego,
iluminación horneada por vértice (antorchas, velas, vidrieras) combinada con un pool de luces dinámicas
parpadeantes, ceniza cayendo, brasas, humo, sangre, sombras de mancha, filtro CRT opcional y siluetas en la niebla.

**Sonido 100 % sintetizado (WebAudio).** Campanas con parciales inarmónicos, voces de criaturas con formantes,
viento, crepitar de fuego posicional, goteos en la cripta, susurros y estática que crecen cuando algo se acerca,
latido con poca vida, reverberación generada y música procedural (canto llano en modo frigio, percusión de jefe,
coro del amanecer).

## Estructura del código

```
src/
  main.js               arranque y bucle
  core/                 entrada (teclado/ratón/mando), audio sintetizado, utilidades y ruido
  gfx/                  texturas procedurales, materiales PSX, post-proceso, efectos, geometría fusionada
  world/                colisión, rejilla transitable, arquitectura, atrezo y el mapa de Braga
  entities/             rig articulado + animador, jugador, criaturas e IA
  game/                 juego, combate, interacción, cámara, atmósfera, navegación A*, interfaz, guardado, textos
tools/                  scripts de prueba automatizada con Playwright (capturas, recorridos, progresión)
```

El progreso se guarda automáticamente en el navegador (`localStorage`) al descansar, abrir pasos y recoger objetos.
