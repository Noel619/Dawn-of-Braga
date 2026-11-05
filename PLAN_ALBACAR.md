# El albacar: el patio de armas del castillo viejo, rehecho

Propuesta del 5 de noviembre de 2026 para la zona que quedó vacía entre la torre de la cárcel y la fortaleza. **No
está hecha**: espera a lo que decida el autor (§9). El plano, a escala: `docs/planos/plan_albacar.png`
(`tools/planos/plan_albacar.py`).

Lo que pidió el autor:

- Quedó **una zona completamente vacía** que corresponde al patio de armas antiguo.
- **El preso no tiene que aparecer dentro del castillo**, pero tampoco fuera de una manera que no tenga sentido o que
  rompa demasiado la historia.
- Hace falta **un rework** de la zona.

## 1. Lo que hay (medido)

- **El vacío.** De los 3.600 m² del patio de armas, **1.290 m² tienen menos de 4 triángulos por m²** (el suelo de tierra
  y poco más; mapa de densidad a 0–8 m de altura, en casillas de 2 m). Es un rectángulo de unos 46 × 32 m entre la
  torre de la cárcel y la fortaleza (x −110 a −64, z −26 a +4), con el fundíbulo y un carro en medio. Es exactamente lo
  que eran **el patio y la torre del homenaje del castillo viejo** (la torre ocupaba x −97 a −71, z −29 a −3 y se
  derribó en la fase 3). Lo que se hizo en la fase 4 (las cuadras, la halconera, el corral de la cocina, el pajar, la
  fragua) quedó contra las murallas, alrededor del hueco.
- **La salida no lo cruza.** De la puerta de la torre de la cárcel a la torre-puerta hay 26 m en línea recta, por el
  enlosado del sur, por el borde del vacío. Se sale, se ve un llano de niebla con el fundíbulo y se va uno a la calle.
- **No tiene sentido.** El patio es la antepuerta de la fortaleza del Rey: el preso sale *dentro del castillo*, al pie
  del puente alzado, y se va por la puerta del castillo como quien sale de casa. Nada le cierra el paso ni dice qué
  pasó allí.
- **La torre del homenaje no se ve** desde el patio (la tapa el cuerpo de la puerta, de 16 m, y queda en el límite del
  plano lejano, a 100–110 m): manda el chapitel del Tombo (lo pendiente #24 de `bugs_y_correciones.txt`).

## 2. La idea: el albacar

Un **albacar** (o albacara) es el recinto murado pegado a un castillo donde, en tiempo de guerra, se recogía la gente
del campo con su ganado. Es parte de las defensas, pero **no es el castillo**: es su refugio, y la gente entra en él
por su propia puerta, desde fuera.

La propuesta: **el patio de armas del castillo viejo es el albacar de la fortaleza.** Cuando el Rey levantó su
fortaleza-palacio al norte, derribó la torre vieja hasta los cimientos y dejó su patio como albacar, con las cuadras,
la fragua y la capilla de la guarnición; la cárcel del castillo viejo, abajo, siguió siendo la cárcel. Cuando llegaron
los almohades, la gente de las parroquias de fuera de la muralla (Dume, Maximinos, San Víctor) se metió en el albacar
con sus bestias y sus carros: unas trescientas almas, bajo lonas, entre los cimientos de la torre vieja. Cuando sonó
la campana de la Sé, **se arrodillaron todos a la vez, donde estaban, de cara a la Sé**. Luego se levantaron y fueron
contra la fortaleza; el alcaide mandó alzar el puente («Que no entre nadie del albacar») y el alférez tiró desde el
cadalso.

**Por qué resuelve lo de dentro y fuera:**

- **No sale dentro del castillo.** El castillo es la fortaleza: al otro lado del foso, con el puente alzado y su
  guardia arriba. No se entra en ella hasta media partida, por arriba (la coracha).
- **Tampoco sale a la calle.** Sale al refugio de la gente de la ciudad, que es adonde da la cárcel de un castillo
  viejo: su patio. Y la puerta del albacar (la torre-puerta) da a la calle del Soto porque por ella entró esa gente.
- **La historia se refuerza, no se rompe.** El motivo del juego (los que oyeron la campana, de rodillas y vueltos hacia
  la Sé: la Corte ante el trono vacío, los presos de la cárcel del Rey contra el muro de levante) es **lo primero que
  se ve** al salir. Y lo que dice el Rey cobra sentido: «Te vi salir de la cárcel, desde esa ventana: **el único que
  salía andando**». Entre trescientos de rodillas, uno andando.
- Casi nada cambia de sitio: las murallas, la torre-puerta, la torre de la cárcel, las mazmorras, el rastrillo, el
  puente y los atajos quedan como están. Cambian el centro vacío, el camino de la salida y lo que se cuenta.

## 3. Las otras dos (y por qué no)

- **B. Fuera: la plaza del castillo.** La fortaleza se queda con una antepuerta pequeña, amurallada, y el resto pasa a
  ser una plaza de la ciudad al pie del castillo; la torre de la cárcel abre su puerta a la plaza (como las cárceles de
  villa, con su reja a la calle). El preso sale fuera, sin duda. Pero hay que levantar una muralla nueva por medio del
  patio, mudar la puerta y lo de la fase 4 (las cuadras y la halconera del Rey quedarían fuera del castillo), y el
  primer altar quedaría en la calle. Más obra y más historia que rehacer, para un sitio menos propio.
- **C. Dentro, pero lleno: el castillo viejo en ruinas.** Se llena el vacío con los cimientos de la torre vieja y la
  última defensa de la guarnición (barricadas, tiendas de soldados). Es lo más barato, pero el preso sigue saliendo
  dentro del castillo, que es justo lo que no se quiere.

## 4. La planta

Norte = −z. El albacar es el recinto del patio de armas de ahora (x −120 a −51, z −32 a +20); lo nuevo va en el vacío
y en los rincones libres, sin tocar lo de la fase 4.

```
 x −120        −106     −97                 −71     −62   −51
z −32  ┌──────────────┬─ FOSO ─┬── cadalso (el alférez, arriba) ──┬ciudad┐
       │corral cocina │ puente │   ante el foso: escalas, muertos │      │
z −29  ├─────┬────────┘ alzado └ ─ ─ cimientos (abiertos al N) ─ ─┼──────┤ muralla del castillo viejo
       │HAL- │  ✝      ✝ ┌───┐ tiendas  ┊  tiendas ┌───┐   ✝    │capilla (altar, hospital)
       │CONE-│ corral    │   │  hogueras┊ (la losa │   │        ├──────┤
z −15  │RA   │ (ganado)  │   │  ✝   ✝   ┊  cegada) │   │ carros │secade│
       │CUA- │   fundí-  │   │   EL CAMPAMENTO     │   │   ✝    ├──────┤
       │DRAS │   bulo    │   └─────────────────────┘   │        │TORRE-│ → calle
z  −3  │     │ corral         ✝      ┌─────────┐   ✝    ┊        │PUERTA│   del Soto
       │     │      EL FOSAL         │EL REPARTO│ ✝      ┊        │      │
z   6  │pajar│    ▯▯▯▯ ✝  ┌──────┐   └─────────┘  carros ┊ pozo  └──────┘
       │     │    ▯▯▯▯    │TORRE │◄─ salida   atravesados┊
       │fragua    ▯▯▯▯ cal│CÁRCEL│      cuartel      almacén · horno
z  20  └───────────────────┴──────┴──── muralla sur (la brecha) ────────┘
                ✝ = de rodillas, de cara a la Sé (al nordeste)
```

## 5. Las piezas

1. **Los cimientos de la torre vieja** (x −97 a −71, z −29 a −3: 26 × 26 m, muros de 2,4). Arrasados a 0,5–1,5 m, de
   mampuesto con las esquinas de sillería, algún machón de 3 m en las esquinas y el muro de carga de en medio, partido;
   abiertos al norte (su muro se lo llevó el foso de la fortaleza: queda una línea de piedras a ras). Dentro, trozos
   del enlosado viejo y, sobre el rellano del rastrillo de abajo, **la losa cegada** de la bajada de la torre vieja: una
   losa con su argolla, sellada con cal y con una cruz pintada (no se abre; es la otra cara de LO QUE SUBE NO ES
   NUESTRO). Los cimientos hacen de cortavientos del campamento y dan altura para pelear (se sube a ellos).
2. **El campamento** (dentro y alrededor de los cimientos): unas treinta chozas de lona sobre palos y tiendas apoyadas
   en los carros, con calles de 2–3 m entre ellas; en cada una, lo de una familia (la manta, la olla sobre la ceniza,
   el cesto de castañas, la rueca, una imagen de su parroquia, una cuna vacía); las hogueras comunales con su caldero;
   las cabras atadas a los carros. **Los de rodillas**: decenas de muertos de rodillas, cada uno donde estaba (el que
   removía el caldero, la que tendía, el que hacía cola), todos vueltos al nordeste, hacia la Sé. Algunos son
   penitentes dormidos que se levantan al pasar.
3. **El reparto**, ante la puerta de la torre de la cárcel: la mesa del despensero de la guarnición bajo un toldo, el
   peso con sus pesas, los sacos vacíos, las tarjas de las raciones, la cola de cántaros y la cola de muertos de
   rodillas. Encima de la mesa, **el libro del albacar** (un documento nuevo, §8).
4. **Los corrales**, ante las puertas de las cuadras: dos cercados de zarzo con sus portillos (por ellos se pasa a las
   cuadras), el ganado de la gente muerto en ellos (ovejas, cabras, una vaca, los cerdos), los pesebres improvisados, la
   paja. El mastín de las cuadras sale a ellos.
5. **El fosal**, entre la fragua y la torre de la cárcel: las tumbas de los que murieron en el albacar antes de la
   campana (de hambre, de fiebres), en filas, con cruces de palos; **la fosa de la cal**, abierta, para los últimos; la
   parihuela con dos amortajados que no se llegaron a echar; la pala del enterrador. Una mujer de rodillas junto a una
   tumba, pero vuelta hacia la Sé, de espaldas a ella. Una ampolla.
6. **Ante el foso: la última embestida.** Al pie de la puerta de la fortaleza: las escalas de mano echadas contra las
   torres (una, partida), los muertos amontonados en el borde del foso y en las estacas, los virotes del alférez
   clavados en ellos y en el suelo, un carro empujado hasta el borde como ariete. Es lo que vio el alcaide desde el
   torno.
7. **La capilla de la guarnición**, hospital de los refugiados (ya está: el altar y los heridos; se añaden los
   jergones de la gente y una pila de ropa).
8. **La puerta del albacar** (la torre-puerta, ya está), por la que entraron.
9. **Se quedan** las cuadras y la halconera, el corral de la cocina y la poterna, el pajar, la fragua, el cuartel, el
   almacén y el horno, el pozo, el secadero y el fundíbulo (con el ganado alrededor).

## 6. El recorrido

**La salida.** Se abre la puerta de la torre de la cárcel: delante, el reparto y, detrás, el campamento con sus
hogueras y los de rodillas; a la izquierda, por encima de las lonas, la fortaleza con el puente alzado, los
estandartes del Rey y el cadalso; al fondo, la torre-puerta. El camino recto a la puerta lo cortan **los carros
atravesados** junto al pozo (con los que se cerró la gente cuando vio que los suyos se levantaban): se pasa por el
reparto y por una calle del campamento hacia la capilla (**el altar**, el primer descanso) y de ahí, por el borde del
secadero, a la puerta. Unos 45 m en vez de 26, por lo mejor de la zona; lo demás (los corrales y las cuadras, el
fosal y la fragua, ante el foso) queda a un lado, para quien mire.

**La vuelta.** Con el puente bajado desde el torno (el atajo de la fortaleza), el albacar es el camino de vuelta a la
ciudad. **Cambia al volver** (la revisión crítica de la fase 7: la mansión de Resident Evil cambia; esto no): al caer el
puente, los del albacar que quedan en pie se han levantado y se han arrimado al foso, de cara a la puerta abierta de la
fortaleza, como si esperaran a que alguien los dejara pasar.

## 7. Encuentros

Los de ahora (cuatro penitentes, dos soldados y el mastín), repartidos con intención, no más: es el principio de la
partida, con la espada y el escudo del carcelero.

- **En el reparto**, un penitente de rodillas en la cola, que se levanta al salir de la torre (el primero, uno solo).
- **En el campamento**, dos penitentes de rodillas entre las tiendas (uno, en un callejón, de espaldas: el primer golpe
  por la espalda) y el que come junto a una hoguera.
- **En los corrales**, el mastín.
- **Ante el foso**, el soldado de la ronda.
- **Junto a la capilla**, el soldado de guardia del hospital.

## 8. Los textos

- **El nombre**: la zona `castle` pasa a llamarse **El albacar**; con nombre propio, el reparto, el campamento, los
  corrales y el fosal (para el mapa y el sonido).
- **Donde dice «patio de armas»** (las últimas líneas del alcaide —«Que no entre nadie del albacar»—, la poterna, el
  puente, la halconera, el plan y el README), «albacar».
- **Un documento nuevo, el libro del albacar**, en la mesa del reparto, de mano del despensero: «Día cuatro del cerco.
  Entran por la puerta del Soto los de Dume y los de Maximinos, con sus bestias: ciento doce almas…». Cuenta los días
  del refugio (las raciones que menguan, los muertos al fosal, las cabras que se matan) y acaba la noche de la
  campana: «Se han arrodillado todos a la vez, mirando a la Sé. El capellán les gritaba que se volvieran al altar. No se
  volvió ninguno».
- **Lo que se examina**: la losa cegada, la fosa de la cal, la cuna vacía, las escalas del foso.
- El principio del README («Despiertas en una celda de las mazmorras del castillo») no cambia: la cárcel es la del
  castillo viejo.

## 9. Lo que tiene que decidir el autor

1. **¿El albacar (A), la plaza de fuera (B) o el castillo viejo en ruinas (C)?** Se recomienda A.
2. **¿Cuánta gente y cuánto horror?** La propuesta: unos trescientos, la mayoría muertos de rodillas; ningún niño a la
   vista (la cuna, vacía).
3. **¿Se corta el camino recto de la salida** con los carros, para que se cruce el campamento y se pase por el altar?
4. **¿Cambia al volver** (los del albacar, arrimados al foso cuando baja el puente)?
5. **¿El nombre?** El albacar, la cerca vieja, el refugio…

## 10. Cómo se haría (si se aprueba)

| Fase | Qué |
|---|---|
| A1 | Los cimientos de la torre vieja y el campamento (`world/castillo_albacar.js`, con sus medidas en `CASTLE`): las tiendas, los carros, las hogueras, los de rodillas; los carros atravesados y el camino de la salida. |
| A2 | El reparto (y el libro del albacar), los corrales, el fosal, ante el foso; la capilla como hospital. |
| A3 | Los encuentros, los nombres, los textos, el sonido (el ambiente del campamento: la lona, el fuego, las cabras) y la luz; el cambio al volver. |

Pruebas: `castlewalk.mjs` (la salida nueva, por el campamento y el altar), `progress.mjs`, y en lo nuevo, `holes.mjs`,
`zfight.mjs`, `camclip.mjs`, `salas.mjs` (la luz) y `rendimiento.mjs` (el campamento no puede costar más que la plaza
del Pan: las tiendas, en pocas mallas). Además, el mapa de densidad del patio: que no quede ningún rectángulo de más de
100 m² por debajo de 4 triángulos/m², salvo las calles.
