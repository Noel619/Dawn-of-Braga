# Planes jubilados

Los planes de diseño y de trabajo que ya están en el juego (o que otro plan sustituyó). Se guardan tal cual, como
historia: por qué cada zona es como es, qué se probó, qué se midió y qué se descartó. **No se borra nada.**

Lo que quedó pendiente de cada uno ya no se apunta en el plan: pasa a la **Hoja de ruta** del `README.md` (y el
detalle de los fallos, a `bugs_y_correciones.txt`). Los comentarios del código siguen citando los planes por su nombre
(«ver `PLAN_FORTALEZA.md`, §5»): todos los que no están en la raíz están en esta carpeta.

## Los que hay

| Plan | Empezado | Qué fue | Al jubilarlo (21 de noviembre de 2026) |
|---|---|---|---|
| `PLAN_JEFE_FINAL.md` | 9 de octubre | El jefe final como una película: el arzobispo en la cisterna, los seis actos del gigante, las dos espringalas y el corazón del dios | **Hecho entero.** Su §9 (Deo Ignoto y el objeto verdadero) lo sustituye el final secreto de `PLAN_FINAL.md` |
| `PLAN_OSARIOS.md` | 20 de octubre | Los cuatro osarios con sus puzles, los objetos benditos, el Panteón de los Obispos, el lucernario y las tres criaturas de la cripta honda | **Hecho** |
| `PLAN_CRIPTA_HONDA.md` | 20 de octubre | La cripta honda rehecha (sus salas, sus épocas, el recorrido), Dom Paio, el Custodio de la Garra; la segunda vuelta (22 de octubre) y la capilla de Sisnando (10 de noviembre) | **Hecho** |
| `PLAN_LORE.md` | 24 de octubre | La historia (1167, los almohades, el plan B a la manera del autor) y las dos introducciones (la corta y la Crónica de Braga) | **Hecho.** Sigue siendo la referencia del lore, salvo en lo que manda `PLAN_FINAL.md` (el dios no da ni devuelve nada; un solo final). Quedan dos detalles de nombres, en la Hoja de ruta |
| `PLAN_TEJADOS.md` | 28 de octubre | La torre de la primera espringala (sin la escalera de la plaza), la fragua del maestre Lourenço y los tejados de los Pellejeros | **Hecho** lo de la torre y la fragua; los tejados se descartaron y se rehicieron como el barrio (`PLAN_BARRIO.md`) |
| `PLAN_BARRIO.md` | 28 de octubre | El barrio de los Pellejeros, Mestre Clemente (el Físico de los Inocentes) y los Coronados | **Hecho**, salvo dos secretos que no se llegaron a hacer (en la Hoja de ruta) |
| `PLAN_CASTILLO.md` | 30 de octubre | El Paço del Rey junto al castillo, las cinco llaves, el Cerco, la Corte de los Infieles, la ballesta y el Caballero de la Orden | **Hecho y sustituido** por `PLAN_FORTALEZA.md`: lo que servía se mudó a la fortaleza. Guarda las respuestas del autor, tal cual (su apéndice) |
| `PLAN_FORTALEZA.md` | 1 de noviembre | La fortaleza-palacio: el patio de armas, las cuatro alas, la torre del homenaje, la puerta, el jardín, la cárcel del Rey y el rastrillo | **Hechas las fases 1 a 7**; la 9 y la 11, en parte. Lo que queda (las fases 8 a 11), en la Hoja de ruta |
| `PLAN_LOBO.md` | 7 de noviembre | El Lobishome, las cloacas hondas (la lobera, las viejas, los aljibes, lo hondo) y los cocimientos del Desfigurado | **Hecho**, con los cambios que pidió el autor (su §0) |

Los planos dibujados de `PLAN_FORTALEZA.md` y `PLAN_LOBO.md` siguen en `docs/planos/` (los hacen los scripts de
`tools/planos/`). Y el plan del jefe final con escalada, el que hubo antes de la película, está con su código en
`archive/jefe_final_trepar/`.

## Los que siguen activos (en la raíz)

- **`PLAN_FINAL.md`** (13 de noviembre): el final, «la terrible verdad» (la columna de almas, el cielo que se rompe y
  la lluvia de sangre) y el final secreto con la espada. Decidido; todavía no hay nada hecho.
- **`PLAN_PACOS.md`** (22 de noviembre): el patio de armas viejo rehecho como los Paços, las casas de los ricos de la
  corte, cerradas a cal y canto. Una propuesta: espera a lo que decida el autor.

## Cuándo se jubila un plan

Cuando lo principal ya está en el juego. Lo que quede se pasa a la Hoja de ruta del `README.md`, y el plan se mueve
aquí con `git mv` (así no pierde su historia). Si se retoma uno, se vuelve a sacar a la raíz.

Una propuesta que el autor descarta no se jubila: se borra (queda en la historia de git). Así se fue el albacar
(`PLAN_ALBACAR.md`, del 5 de noviembre: el patio de armas como refugio de la gente de fuera), el 22 de noviembre; lo
sustituye `PLAN_PACOS.md`.
