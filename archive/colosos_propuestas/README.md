# Propuestas de jefe final (archivadas)

Aquí están los modelos 3D de las tres propuestas de jefe final que se hicieron el 7 de octubre de 2026,
guardados por si algún día se quieren usar (otro jefe, una zona nueva, un final alternativo).

## De dónde salen

Se pidieron tres planes para un jefe final a lo *Shadow of the Colossus*: un coloso de carne que se pelea
dentro de la ciudad, con casi todo destructible, y que al morir revienta y deja salir su verdadera forma,
más grande que la catedral. Cada plan tiene una primera forma y una verdadera forma, modeladas por código
con el escultor de carne (superficies implícitas convertidas en malla, con oclusión horneada y pesos de
piel para un esqueleto) y fotografiadas en el motor del juego.

- **Plan A: el Turiferario → Deo Ignoto.** El elegido el 8 de octubre de 2026. Sus modelos se rehicieron
  para el juego (versión 2, en `src/entities/colossus/`); los de aquí son el **boceto** con el que se
  presentó. Ver `PLAN_JEFE_FINAL.md` en la raíz.
- **Plan B: el Tordo → la Masa.** El caballo del canónigo (la tablilla del mozo de cuadra: «Esta mañana
  tenía ocho patas»), sobre ocho patas de zancos; al morir le revienta el vientre y sale la masa de la
  nota del panadero («La masa no sube. Crece.»), que se traga la plaza.
- **Plan C: la Procesión → la Sé.** Los fieles que se encerraron en la catedral (la nota ensangrentada
  del soldado), fundidos en un ciempiés de nazarenos con los pasos a cuestas; al morir se levanta la
  catedral y echa a andar sobre seis patas de araña.

## Estado

**El juego no los usa.** Nadie los importa, así que no entran en la build ni cuestan nada al cargar.
Sólo los abre el laboratorio de capturas (`src/dev/colossus_lab.js`), y sólo con el servidor de
desarrollo. Son modelos con su esqueleto y unas poses de captura: no tienen animación, ni IA, ni pelea.
Para usar uno habría que hacerle todo eso con el mismo sistema que el Plan A (`src/game/finale/`).

## Archivos

| Archivo | Qué es | Medidas |
|---|---|---|
| `turiferario_boceto.js` | Plan A, primera forma (boceto) | 21 m; 26 con la aureola |
| `deo_ignoto_boceto.js` | Plan A, verdadera forma (boceto) | 56 m de cuerpo; 87 con las manos alzadas |
| `tordo.js` | Plan B, primera forma: el Tordo | 34 m con la cabeza alta; 25 al lomo |
| `masa.js` | Plan B, verdadera forma: la Masa | 41 m de alto, 68 de ancho (100 con las lenguas) |
| `procesion.js` | Plan C, primera forma: la Procesión | 98 m de largo |
| `se_viva.js` | Plan C, verdadera forma: la Sé | 48 m de alto, 85 de pata a pata |
| `sculpt_v1.js`, `colfx_v1.js` | Copias congeladas del escultor y de los efectos tal como estaban al hacer las propuestas | — |
| `capturas/*.json` | Los encuadres de las capturas (para `tools/colshot.mjs`) | — |

El escultor de `src/` sigue cambiando para el jefe final; por eso estos modelos usan su propia copia
(`sculpt_v1.js`): así no se rompen ni cambian de aspecto. Siguen usando del juego los materiales y las
texturas de los colosos (`colMat` y las entradas `col…` de `src/gfx/materials.js`, y sus texturas en
`src/gfx/textures.js`), el `partGeometry` de `src/entities/rig.js` y el `RNG` de `src/core/util.js`: si
se tocan, hay que comprobar que estos modelos siguen funcionando.

## Cómo verlos

```bash
npx vite --port 5199                                           # en otra terminal
node tools/colshot.mjs archive/colosos_propuestas/capturas/fB1.json
```

Las imágenes salen en `tools/shots/colosos_propuestas/` (carpeta ignorada por git). Cada `.json` coloca
el modelo en la ciudad o en el estudio y saca unos planos: `fA`/`fA2` (Plan A), `fB1`/`fB2` (Plan B),
`fC1`/`fC2` (Plan C), los `…s` en el estudio y `lineup` los tres a la misma escala. En el laboratorio sus
nombres son `boceto_turiferario`, `boceto_deo`, `tordo`, `masa`, `procesion` y `se`.

La página con la presentación original (las 27 capturas y los tres planes) es
https://claude.ai/artifact/RthshDMNPWghqW55EzWsvY (privada: sólo la ve su dueño).
