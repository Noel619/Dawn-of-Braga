# Los refugios: las casas que se hacen tuyas (plan)

Propuesta del 25 de noviembre de 2026, a partir de lo que pidió el autor. **Sustituye a los altares de descanso.**
**No está hecha**: espera a lo que decida el autor (§12). Va antes que la fragua y el alfaqueque (la propuesta del
herrero de Évora y del mercader, del mismo día, que todavía no tiene plan propio): los dos se apoyan en esto (§9).

Lo que pidió el autor:

- Los sitios de descanso dejan de ser capillas y altares: pasan a ser **casas abandonadas, de una o dos plantas**,
  con criaturas dentro (llenas, o con las que sean razonables).
- **Hay que asegurarlas**: tienen puertas, y hay que abrirlas y cerrarlas; lo que haga falta para que el sitio quede
  cerrado. Como los sitios que se liberan en *Assassin's Creed*.
- Que no vuelva a pasar que **reaparezcas a un metro de una criatura** porque el sitio no está bien cerrado.
- **Interiores con sentido.**
- **Lo de descansar cambia**: a veces, sencillamente, un rosario y una imagen de Dios en la pared, con luz cálida.
- En estos sitios se encuentra **oro, que es limitado**.
- Que el plan no se quede en eso: adaptarlo donde haga falta.

## 1. Lo que hay (medido)

Diez altares (`kind: 'altar'`): un altar de velas (`P.candleAltar`) y un punto donde se reaparece. Descansar cura,
rellena las ampollas, guarda y **devuelve a todas las criaturas a su puesto** (`game.restAt`); al morir se reaparece
en el último (`respawnAtAltar`). Medidos con `tools/altares.mjs` (nuevo), con las criaturas en su puesto, que es como
quedan al descansar o al morir:

| Altar | Dónde | ¿Se cierra? | La criatura más cercana al reaparecer |
|---|---|---|---|
| Capilla de la guarnición | El castillo: el primero | No: un hueco sin hoja al patio | Un penitente a 7,7 m, en el patio, con el punto a la vista (comiendo: hasta que te mueves) |
| Oratorio de Santa Bárbara | El patio del Horno | No | A 21 m: el más tranquilo («ninguna criatura ronda el patio») |
| Cruceiro del Largo | En medio de la plaza, a la intemperie | — | **Un soldado cosido a 3,5 m que te percibe al aparecer**, y una Plañidera a 12,5 m que también. Sólo se enciende tras reventar el Turiferario, como punto de control del final secreto (sin enganchar) |
| Capilla de San Fructuoso | La calle de la Muralla | No | Un soldado a 16 m, fuera |
| Oratorio de la cerera | El barrio, en el sobrado de su casa | Tres puertas | Ninguna en su planta a menos de 40 m: es lo más parecido a lo que se pide |
| Altar de la cripta | Bajo la Sé, en la sala de llegada | No: una sala de arcos | Un soldado a 15 m, y el Campanero, que ronda, a 19 |
| Capilla de San Martín | La cripta honda | No | Dom Paio (amigo) a 4,5 m; la primera hostil, a 33 |
| Oratorio de San Pedro de Rates | Las catacumbas, el lucernario | No | **Una emparedada a 5,8 m que te percibe al aparecer** |
| Capilla Real | La fortaleza | Dos puertas, abiertas | **Un cortesano de rodillas a 4,8 m que te percibe al aparecer**, dentro de la capilla |
| Torre de la coracha | La fortaleza, sobre las cámaras del Rey | No: se sube por la escalera | Un soldado a 11,6 m, a su misma altura, que llega andando en 15; y tres a 9–10 m, una planta más abajo |

Lo que sale de ahí:

- **En tres reapareces junto a una criatura que te percibe** (el cruceiro, Rates y la Capilla Real). En la capilla
  del castillo, un penitente te tiene a la vista a 7,7 m; en la coracha, un soldado llega andando en 15 m.
- **Ninguno se cierra.** Lo que hoy los hace seguros es dónde están puestas las criaturas, no los muros: lo que ronda
  (el Campanero de la cripta, la Plañidera de las catacumbas) llega igual.
- **Descansar rellena también lo de dentro**: si limpias la sala del altar, al descansar vuelve todo.
- **Hay zonas grandes sin ningún sitio de descanso**: lo hondo entero (la lobera, las cloacas viejas, los aljibes, lo
  hondo y el Sumidero: más de 15.000 m² y 33 criaturas); el Postigo (el Empalado, el callejón y la Casa del Alemán: el
  altar de superficie más cercano, San Fructuoso, queda a 84 m del Empalado y a 120 de la casa, en línea recta); y el
  ala de poniente de la fortaleza (la Corte de los Infieles, la cocina, la despensa, la reina: a 60–80 m de la Capilla
  Real).
- **Al descansar, el Condenado se arrodilla**: la animación (`clips.rest`, en `entities/weapons.js`) es una
  genuflexión, con una rodilla en el suelo. Es el que escribió NO TE ARRODILLES por las paredes y el que, en el final,
  «no se arrodilla» (`PLAN_FINAL.md`, plano 11).

Lo que ya está y sirve:

- **La Casa del Alemán** (`game/house.js`) es un refugio hecho a mano, una vez: las contraventanas que las criaturas
  revientan para saltar dentro, la defensa por oleadas y el tapiar cada ventana con martillo, clavos y un tablón para
  «hacer de la casa un sitio seguro».
- **Las puertas**: las atrancadas por un lado (`lock: 'barred'`), las clavadas que se arrancan con la palanca
  (`'boards'`) y las que se vuelven a cerrar con su navegación (`slamShut`, `tapiar`, `refreshDoorNav`: en el barrio,
  una puerta cerrada ya es un muro para las criaturas).
- **El ruido** (`game.noise`): arrancar unas tablas o reventar algo despierta a las que oyen y las manda a ver (y al
  Físico, que lo oye todo).
- **La imagen** (`imagenSanto`, en `world/mobiliario.js`): una tabla pintada clavada al muro con su repisa de velas,
  con dos pinturas hechas (`animasRetablo`, `virgenCarmen`). **El rosario** del canónigo tiene su modelo
  (`game/interact.js`).
- **Las casas del barrio** (`world/kit_casa.js`): de varias plantas, con escaleras de verdad, forjados, desván y
  tejados que se andan.
- **El mapa** dibuja lo de las zonas visitadas (`game.visited`) y ya tiene un icono para los altares.

## 2. La idea

La noche de la campana, los que no se arrodillaron en la calle se encerraron en sus casas. Lourenço lo dejó en su
libro: «Los de la casa de enfrente se han encerrado con sus muertos y han clavado la puerta. Van de una casa a otra por
dentro, y por los tejados». El tabernero atravesó una mesa en la cocina y cerró la bodega; Henrique se atrancó arriba;
Joana clavó su herbolería. Algunas casas aguantaron unas noches. Ninguna aguantó: lo de fuera se les metió dentro, o
se les levantó dentro. Quedan casas cerradas por dentro, con la familia todavía en ellas y, en un rincón, la imagen de
la casa y una lamparilla apagada.

**Un refugio es una de esas casas, recuperada.** Entras como puedes, la limpias, la cierras y enciendes la
lamparilla. Desde entonces es tuya: ahí descansas, ahí te levantas, y ahí no entra nada.

Por qué funciona:

- **La seguridad la dan los muros, no el reparto.** Reaparecer junto a una criatura deja de poder pasar (§7).
- **Cada refugio es un nivel pequeño**: una o dos plantas, dos o tres maneras de entrar, una familia, una historia y
  su oro. Lo de los sitios que se liberan en *Assassin's Creed* o los puestos de *Far Cry*, a la escala de una casa y
  con miedo.
- **Encaja con lo que ya se cuenta**: el libro de Lourenço, la casa tapiada, la mesa del tabernero, Henrique, el Físico
  que pone en cuarentena las casas del barrio.
- **Se ve lo que es tuyo**: cada refugio encendido deja luz en sus ventanas, y la ciudad se va llenando de tus luces.
- **La ironía se afila**: te levantas bajo la imagen de un santo, y no es el santo quien te levanta (Dom Paio: «Reza
  por que sea el santo quien te levanta»; `PLAN_FINAL.md`, §1.2).

## 3. Cómo se hace tuya una casa

1. **Verla.** Desde la calle se distingue de las de adorno, como ya se distinguen las que se visitan: está cerrada
   **por dentro** (las tablas de las ventanas, clavadas por el lado de dentro: lo contrario de las cuarentenas del
   Físico, que clavan por fuera y llevan su cruz de cal) y en la aldaba cuelga, seco, **el ramo de olivo** del Domingo
   de Ramos, el que se guardaba en casa para que no entrara el mal. En el mapa sale como un refugio sin encender.
2. **Entrar.** Cada una tiene dos o tres entradas, y elegir es lo que la hace un pequeño puesto que asaltar:
   - **la puerta de la calle**, atrancada por dentro: por ahí no; será la tuya;
   - **la puerta de atrás** (al corral, al callejón), clavada: con la palanca y **con ruido** (`game.noise`): todos
     los de dentro despiertan y van a ver;
   - **una ventana de arriba**, subiendo por un carro, un tejadillo o una escalera de mano: **en silencio**, y se les
     coge de uno en uno;
   - **por los tejados** (en el barrio, por su desván) o **por debajo** (la trampilla de una bodega que da a las
     cloacas).
3. **Limpiarla.** Dentro, la familia: de ninguna criatura (una casa vacía que se siente mal) a cinco o seis, puestas
   con sentido: el padre de rodillas ante la cuna vacía, la abuela rezando de cara a la pared, el perro royendo, la
   hija en la ventana, el rastrero en el techo de la alcoba. Las de un refugio son **de esa casa**: muertas, no vuelven
   nunca (hoy, al descansar, vuelve todo).
4. **Cerrarla.** Cada hueco cuenta, y en pantalla se lleva la cuenta, como las ventanas de Henrique («Huecos: 2 de 4»):
   - **la puerta de atrás**: se le echa la tranca (si la reventaste, se apuntala con un tablón);
   - **una ventana rota**: se tapia con martillo, clavos y un tablón, como en la Casa del Alemán. Las casas con
     ventanas rotas esperan al martillo: una puerta natural en la progresión;
   - **la trampilla** del desván o de la bodega: se le echa el cerrojo;
   - **la escalera de mano** de una ventana: se sube.

   **La puerta de la calle pasa a ser la tuya.** Su llave está en la casa (colgada de un clavo, en el arca, en el cinto
   del padre). Desde entonces se entra y se sale por ella, y se cierra sola detrás de ti (echas la llave al pasar).
   Todas van en **un llavero**, que no llena el inventario. Las demás puertas del refugio se abren desde dentro y se
   cierran detrás: son atajos de un solo sentido, como las atrancadas de ahora.
5. **Encender la lamparilla.** En el rincón de la imagen (§5), con el farol, como los braseros de la lobera. Al
   prenderse, la luz cálida llena el cuarto, suena el tema del refugio, se guarda la partida y el refugio queda
   encendido. Desde entonces: «Descansar».
6. **La primera noche** (sólo en dos o tres): al encender, algo viene. Una oleada corta contra la contraventana que no
   reforzaste, como la defensa de Henrique, para que se sientan los muros que acabas de cerrar. En la taberna (la
   primera grande), en la Casa del Alemán (que ya la tiene) y, si se aprueba, en la fragua.

## 4. Lo que da un refugio

- **Descansar**, como hoy: la vida, el aliento, las ampollas, la partida guardada y las criaturas **de fuera** a su
  puesto. Dentro no vuelve nada.
- **Levantarse ahí**: al caer, despiertas dentro, delante de la imagen, con la puerta cerrada. Lo más cercano que haya
  está al otro lado de un muro (§7).
- **Su oro** (§6).
- **Lo que cuenta**: quién vivía ahí, en un documento o en la casa misma.
- **Un atajo**: cada refugio abre algo hacia el resto del mapa: su puerta de atrás a otra calle, un paso a la casa de al
  lado (el armario sin fondo del Físico, pendiente en el pulido de la hoja de ruta, es exactamente esto) o la salida
  al tejado. «Van de una casa a otra por dentro, y por los tejados.»
- **La vista** (en los que tengan ventana alta o desván, a lo *Assassin's Creed*): desde ella se ve el barrio, y el
  mapa se rellena alrededor (sus zonas pasan a `visited`).
- **Luz en las ventanas**: desde la calle, y de lejos (como la vela del Rey, `game/hitos.js`), las ventanas de un
  refugio encendido son cálidas.
- **Lo que te persigue se queda fuera**: si entras con algo detrás, la puerta se cierra y se queda aporreándola (la
  pose `pound`, la de la Casa del Alemán) hasta que se cansa y vuelve a su puesto. Como las salas seguras de *Resident
  Evil*.
- **En las cuentas del final** (el tiempo, las muertes, los documentos), los refugios encendidos.

## 5. La imagen, el rosario y la lamparilla (lo que sustituye al altar)

Los altares de velas dejan de ser donde se descansa (los de las capillas se quedan, de adorno). En cada refugio, **el
rincón de la imagen**, lo que rezaba la casa. Siempre tres cosas:

- **La imagen**, en el muro: lo que cada casa tuviera.
  - En las de los oficios, **una tabla pintada** (`imagenSanto`), románica, como se pintaba en 1167: **Cristo en
    majestad** (el Pantocrátor, con el libro y la mano alzada), **Santa María sentada con el Niño en las rodillas**,
    **San Geraldo** (el arzobispo de Braga que murió en olor de santidad hace casi sesenta años) o el santo del
    gremio.
  - En las pobres, **una cruz de dos palos atados** y el ramo de olivo.
  - En las de los ricos, **un crucifijo tallado** sobre la cama o **una hornacina** con el santo de bulto (como San
    Eloy en la fragua).
- **El rosario**, colgado del clavo de la imagen o de la cruz. En 1167 se diría unas cuentas o un paternóster; el
  juego ya llama rosario al del canónigo, y se queda así.
- **La lamparilla**: un candil de barro, de piquera, de los de aceite que había en todas las casas de la Península.
  Apagado hasta que lo enciendes. Su luz es la única cálida de un interior: naranja, baja, que tiembla. Como los fuegos
  que ya alumbran (`ctx.fires`), con su llama, su resplandor y un hilo de humo.

**Cómo se descansa.** Hoy, de rodillas. Se propone que **se siente en el suelo, con la espalda contra la pared, bajo
la imagen, mirando la llama**: el que no se arrodilla no se arrodilla nunca, tampoco ante una imagen (§12).

**El texto.** «Descansas bajo la imagen. La lamparilla arde. Fuera, las criaturas vuelven a sus puestos.» El aviso del
primer descanso, igual, con las palabras nuevas. La ampolla sigue siendo de Santa Bárbara y se rellena al descansar.

## 6. El oro

**Qué es.** **Morabetinos**: la moneda de oro que corría a los dos lados de la frontera (los dinares que batieron los
almorávides; Portugal no batirá oro suyo hasta que reine el hijo del Rey). Los dineros del Rey son de plata baja, y al
final se batieron con plomo (`PLAN_PACOS.md`, la Moneda): fuera de Braga no valen nada. Fuera, sólo vale el oro, y por
eso lo quieren el herrero y el alfaqueque (§9). Dentro de Braga, el oro no compra nada: hasta que aparecen ellos, se
guarda.

**Dónde está.** Sobre todo en los refugios, **escondido como se escondía en una guerra**: bajo una losa del suelo, en
una olla enterrada junto al hogar, **detrás de la imagen**, cosido en el dobladillo de una saya, en un hueco del muro
tapado con barro. Cuando la hueste almohade apareció ante la muralla, la gente de Braga enterró lo que tenía, y nadie
volvió a por ello, como tantos tesorillos de aquellos siglos. Unos escondrijos brillan en la grieta; otros tienen su
pista en un documento («bajo la tercera losa, contando desde el hogar»). Fuera de los refugios, en pocos sitios y con
nombre: el tesoro del camarero, en la fortaleza; el légamo de la alberca; y, si se aprueban, el cambista y las casas de
los Paços.

**Cuánto.** Lo que tendría cada casa: poco en las de los oficios, más en las de los ricos. **Es limitado**: el total
del mundo es fijo, ninguna criatura lo suelta y nada vuelve. Como orden de magnitud, **unos 250 morabetinos en todo el
juego**, algo más de la mitad en los refugios. Los precios (del plan de la fragua y del alfaqueque) se ponen para que
**el oro del mundo pague más o menos el 60 % de lo que se vende**: hay que elegir. Al morir no se pierde. Se lleva la
cuenta en el inventario y, al cogerlo, un aviso («+6 morabetinos»).

| Refugio | Lo que guardaban | Morabetinos (orientativo) |
|---|---|---|
| La torre de la cárcel | La bolsa del carcelero, lo que cobraba a los presos por una manta o una vela | 4 |
| La Taberna del Cuervo | Lo que el tabernero no se atrevió a gastar, en una olla bajo el hogar | 10 |
| La tintorería | El oro de la grana, que se pagaba caro, tras la imagen | 15 |
| La casa de la cerera | Lo que le dejó el marido, cosido en una saya | 8 |
| La Casa del Alemán | Lo que el padre de Henrique guardaba para volver a Colonia (te lo da él) | 20 |
| La celda del sacristán | Lo que sisaba del cepillo | 6 |
| La capilla de San Martín | Nada: Dom Paio lo dio todo | 0 |
| La celda del enterrador | Lo que les quitaba a los muertos | 10 |
| La Cancillería | Los derechos del sello | 30 |
| La torre de la coracha | La limosna del Rey | 15 |
| La despensa (opcional) | La sisa del despensero | 8 |
| La botica del Desfigurado | Las monedas que le echaban a la fuente de la plaza, que bajan con el agua | 2 |
| El osario de Bento | Las monedas de la boca de los muertos de la fosa de los pobres | 15 |
| **Fuera de los refugios** | El tesoro del camarero (40), la alberca (10) y los Paços (50, si se aprueban) | 100 |

## 7. La regla: que nunca aparezcas junto a una criatura

1. **Dentro de un refugio asegurado no hay ninguna criatura**: las de la casa no vuelven (`refugio:<id>`) y ninguna
   otra tiene su puesto dentro.
2. **Sus puertas, sus ventanas tapiadas y sus trampillas son muros** para la navegación de las criaturas, como las
   puertas del barrio (`refreshDoorNav`). Nada atraviesa la puerta de un refugio: ni el Físico, que va a los ruidos, ni
   lo que te persigue.
3. **El punto donde te levantas**, dentro y delante de la imagen: ninguna criatura en su planta a menos de 12 m sin una
   puerta cerrada en medio, ninguna lo ve (la línea de vista desde sus ojos) y ninguna llega andando.
4. **`tools/refugios.mjs`** (nuevo, a partir de `tools/altares.mjs`): para cada refugio, lo asegura (sus banderas),
   pone al jugador en el punto, comprueba lo de arriba, deja correr veinte segundos con todas las criaturas y comprueba
   que no entra nadie; y de cada hueco, que está cerrado para la navegación. Entra en las pruebas largas (la fase de
   «Pruebas y fallos»).

## 8. Refugio por refugio

Un refugio tiene sentido donde alguien se habría encerrado de verdad: una casa, o un cuarto con una sola puerta que se
cierra. No una capilla abierta a la calle. Donde no hay casas (bajo la Sé, en las cloacas), se adapta: cuartos con su
puerta, y en lo hondo, el sitio de quien vivía allí.

| | Refugio | Dónde | En lugar de | Plantas | Dentro | Lo que pide | Lo que tiene |
|---|---|---|---|---|---|---|---|
| 1 | **La torre de la cárcel** | El castillo: la salida de las mazmorras (`torre_carcel`) | La capilla de la guarnición | Dos | Hoy nadie: dos carceleros | Nada: su puerta y la lamparilla | El primero, el que enseña: una puerta, dos criaturas fáciles. La primera casa que haces tuya es la de tus carceleros. Desde arriba se ve el patio. La capilla se queda como está, de adorno |
| 2 | **La Taberna del Cuervo** | Entre el Soto, la plaza y el callejón (`taberna`) | El Oratorio de Santa Bárbara | Una y la bodega | Hoy dos: tres | La mesa de la cocina (se rompe, como ahora); sus tres puertas; la trampilla de la bodega, con su cerrojo | El tabernero ya lo intentó: terminas lo que él empezó. Su primera noche. La trampilla baja a la cloaca, y de ahí al Vergel |
| 3 | **La tintorería** | La calle de los tintoreros (`tintoreria`) | San Fructuoso | Una y el secadero de las telas (nuevo) | Hoy una Plañidera: tres | La palanca o el martillo, según por dónde se entre | Entre la plaza, la casa del canónigo y la muralla. San Fructuoso se queda como capilla |
| 4 | **La casa de la cerera** | El barrio (`viuda`) | Se queda (su oratorio) | Dos y desván | Hoy nadie: dos o tres | Sus tres puertas | Ya es casi lo que se pide: el prototipo. Velas por todas partes: era cerera |
| 5 | **La Casa del Alemán** | El Postigo (`casa_aleman`) | Nuevo | Dos y sótano | La defensa de Henrique, como está | Martillo y tablones, como está | Al tapiar las cinco ventanas pasa a ser refugio, con Henrique dentro. El altarcillo de su padre. Cubre el Postigo y el Empalado |
| 6 | **La celda del sacristán** | Bajo la Sé, junto a la sala de llegada (nueva) | El altar de la cripta | Una | Dos | — | Un cuarto con su puerta: el jergón, las llaves de la Sé colgadas, el arca de los cirios |
| 7 | **La capilla de San Martín** | La cripta honda (`capilla_martin`) | Se queda | Una | Dom Paio | Su puerta (nueva) | El único con alguien vivo dentro. Cuando Dom Paio falte, sigue siendo tuya |
| 8 | **La celda del enterrador** | Las catacumbas, junto al lucernario (nueva) | El Oratorio de San Pedro de Rates | Una | Dos | — | El oratorio se queda, de adorno; la emparedada, donde está |
| 9 | **La Cancillería** | La fortaleza, junto a la capilla (`cancilleria`) | La Capilla Real | Una | Hoy nadie: tres escribanos | Sus dos puertas (una, la del Tombo) | La caldera de la cera da la luz cálida |
| 10 | **La torre de la coracha** | La fortaleza (`coracha_torre`) | Se queda | Una | Hoy nadie: una | La trampilla de la escalera (nueva) | Se cierra por abajo: lo más fácil de la fortaleza |
| 11 | **La despensa** (opcional) | La fortaleza, ala de poniente (`despensa`) | Nuevo | Una | Hoy un penitente: dos o tres | Sus dos puertas | Antes de la Corte de los Infieles. La tablilla del despensero |
| 12 | **La botica del Desfigurado** | El Vergel (`vergel`) | Nuevo | — | Nadie (hoy no pisa el Vergel ninguna criatura) | Hablarle | La excepción: no hay nada que cerrar, lo verde no lo pisan. Te deja encender el candil de su mampara |
| 13 | **El osario de Bento** | La lobera (`lobera_osario`) | Nuevo | — | El Lobishome | Vencerle | Su cama de paja, su pala y su osario: la casa del sepulturero. El refugio de lo hondo |
| — | **La fragua** | La Herrería | Nuevo, si se aprueba | Dos (el sobrado) | La de la propuesta | Sus misiones (§9) | El refugio con herrero |
| — | **Una casa de los Paços** | La Cerca (la de las dueñas) | El altar de su capilla, si se aprueban | Dos | La del plan | Sus puertas | `PLAN_PACOS.md`, P3 |

**El cruceiro del Largo no es un refugio**: es el punto de control de la pelea contra Deo Ignoto, que sólo hay en el
final secreto, y no está enganchado. Se queda fuera de este plan. Cuando se enganche (con la espada, `PLAN_ESPADA.md`),
que no sea en medio de la plaza con el Largo poblado: hoy reaparecerías a 3,5 m de un soldado.

## 9. Con la fragua y el alfaqueque

- **La fragua es un refugio más.** La misión «Una fragua con puertas» de la propuesta del herrero es su ciclo: cerrar
  el portalón con su tranca (la que se llevó Henrique para su puerta), tapiar las dos ventanas de la plaza, hacer tuya
  la puerta de atrás, cerrar la trampilla del sobrado al tejado, sacar a Lourenço del fuego y encender la lamparilla
  bajo San Eloy.
- **El alfaqueque sólo se pone donde tú has hecho seguro**: en los refugios encendidos, en unos sí y en otros no, y se
  muda. Deja su marca de tiza en tu puerta.
- **El oro** (§6) es lo que se gasta con los dos.
- De este plan, aquél necesita antes el refugio (R1–R2) y el oro (R6).

## 10. Lo que se puede poner encima (opcional)

- **Las luces del final.** En el plano 9 de `PLAN_FINAL.md` («el último sol se apaga»), desde el embarcadero, las
  ventanas de los refugios que encendiste se apagan una a una sobre Braga: lo que hiciste, dicho con tus propias luces.
  Toca el plan del final.
- **El Físico te marca la puerta.** Si te ve entrar en un refugio del barrio, al salir encuentras en tu puerta su cruz
  de cal, como en las de sus pacientes. No entra, pero ya estás en su historia clínica.
- **El tema del refugio**: uno propio, quieto, que sólo suena dentro de un refugio encendido; lo de fuera, amortiguado.
- **Viajar entre refugios**: no se propone, porque el juego es de atajos, como el primer *Dark Souls*. Se decide al
  medir cuánto dura una partida (en «Pruebas y fallos»): si pasa de unas dos horas, de la imagen de un refugio a la de
  otro.
- **La Virgen del Carmen** de San Fructuoso (`virgenCarmen`) es de una devoción de un siglo después: si se quiere
  afinar, una Santa María románica.

## 11. Lo que cambia en lo que ya está

| Dónde | Qué | Cambio |
|---|---|---|
| `world/level_castle.js`, `level_barrios.js`, `level_city.js`, `level_sacred.js`, `level_crypt2.js`, `lucernario.js`, `fortaleza_capilla.js`, `fortaleza_rey.js`, `barrio_casas.js` | Los diez `kind: 'altar'` y sus `candleAltar` | Los altares de las capillas se quedan, de adorno; descansar pasa al rincón de la imagen de cada refugio |
| `game/game.js` | `restAt`, `respawnAtAltar`, `lastAltar` | Descansar ante la imagen; levantarse en el último refugio; las criaturas de un refugio asegurado no vuelven |
| `game/house.js` | Las contraventanas, los tablones y la defensa de Henrique | Se sacan a un módulo de refugios (`game/refugios.js`) que usan todos; la Casa del Alemán, la primera que lo usa tal cual |
| `game/interact.js` | Las puertas | La que se atranca y se desatranca desde dentro, la de la llave (que se cierra sola detrás), la trampilla con cerrojo y la escalera que se sube |
| `entities/weapons.js` | `clips.rest` (de rodillas) | Sentado contra la pared, si se aprueba |
| `game/story.js` | `MSG.rest`, los avisos, los nombres de las zonas | El texto nuevo, un documento por refugio (quién vivía) y el morabetino |
| `game/ui.js` | El mapa (el icono del altar) y el inventario | El refugio visto y el encendido; el oro y el llavero |
| `core/audio.js` | La capa del altar (lo que suena cerca de un altar) | La lamparilla y el tema del refugio |
| `dev/devmode.js`, `dev/instances.js` | Ir a cada altar; el cruceiro | Ir a cada refugio, y asegurarlo de un golpe |
| `tools/progress.mjs`, `barriowalk.mjs`, `fortalezawalk.mjs`, `uishots.mjs`, `circula.mjs` | Usan los altares por su id | Los refugios |
| `README.md` | «altares de descanso que curan…», «Los altares de descanso están en lugares a salvo…» | Los refugios |
| `PLAN_PACOS.md` | «la capilla de la guarnición (el primer altar)», «la capilla (el altar)» | El primero, la torre de la cárcel; el de los Paços, una casa |
| `PLAN_FINAL.md` | — | Sólo si se aprueban las luces del final (§10) |

## 12. Lo que tiene que decidir el autor

1. **¿Estos refugios (§8)?** Sobre todo: la torre de la cárcel en lugar de la capilla del castillo, la taberna en
   lugar de Santa Bárbara, la tintorería en lugar de San Fructuoso, y lo de abajo (las celdas del sacristán y del
   enterrador, la botica, el osario de Bento), donde no hay casas.
2. **¿Se sienta o se arrodilla al descansar?** Se recomienda que se siente.
3. **¿La primera noche**, una oleada al encender: en dos o tres refugios (recomendado), en ninguno o en todos?
4. **¿El oro son morabetinos, unos 250 en todo el juego?** ¿Y se puede coger antes de que estén el herrero y el
   alfaqueque, o entra con ellos?
5. **¿Viajar entre refugios?** Se recomienda que no, y decidirlo al medir la partida.
6. **¿Algo del §10?** Las luces del final, la cruz de cal del Físico, el tema propio.

## 13. Cómo se haría (si se aprueba)

| Fase | Qué |
|---|---|
| R1 | **El refugio, en uno**: el módulo (`game/refugios.js`) con sus estados (cerrado, limpio, asegurado, encendido), sus huecos, la puerta de la llave, las criaturas de la casa que no vuelven, la navegación, levantarse dentro y la cuenta de los huecos en pantalla; el rincón de la imagen (la tabla, el rosario y el candil, con su luz) y el descanso (sentado, si se aprueba). En la casa de la cerera, que ya es casi uno |
| R2 | **La regla y su prueba**: `tools/refugios.mjs` (§7) y la tabla del §1, rehecha con los refugios |
| R3 | **Los del principio**: la torre de la cárcel (la que enseña) y la Taberna del Cuervo, con su primera noche. Fuera los altares del castillo y de Santa Bárbara |
| R4 | **El resto de arriba**: la tintorería y la Casa del Alemán (de `house.js` al módulo, sin cambiar lo de Henrique) |
| R5 | **Lo de abajo y la fortaleza**: la celda del sacristán, San Martín, la celda del enterrador, la botica, el osario de Bento, la Cancillería, la coracha y, si se quiere, la despensa |
| R6 | **El oro**: el morabetino, los escondrijos y sus pistas, la cuenta en el inventario (con el plan de la fragua y del alfaqueque) |
| R7 | **Lo de todos**: el mapa, el modo de pruebas, los textos y el documento de cada casa, el README, las partidas guardadas (§14), las pruebas largas, el teléfono y la versión jugable |

Pruebas: `refugios.mjs` (nueva), `progress.mjs` (la progresión entera, ahora de refugio en refugio), `barriowalk.mjs`,
`fortalezawalk.mjs`, `castlewalk.mjs`, `circula.mjs` (los muebles nuevos no tapan el paso), `camclip.mjs` (la cámara
en casas pequeñas de dos plantas), `salas.mjs` (la luz de la lamparilla), `holes.mjs`, `zfight.mjs` y
`rendimiento.mjs`.

## 14. Riesgos

- **La dificultad del principio.** Cada sitio de descanso cuesta ahora una pelea, y hay unas veinte criaturas más.
  Los dos primeros, fáciles; en todos, las razonables.
- **La progresión.** Algunas casas son paso (la taberna une el Soto, la plaza y el callejón). Toda puerta de un refugio
  se abre desde dentro, y ningún camino que hoy se anda puede quedar cerrado por los dos lados (`progress.mjs`).
- **La Casa del Alemán.** Su guion (`house.js`) es de lo más delicado del juego: se generaliza sin cambiar lo que pasa.
- **Las partidas guardadas.** Quien tenga como último altar uno que desaparece, se levanta en el refugio que lo
  sustituye, y ése se le da por asegurado y encendido: es donde ya descansaba.
- **El Físico y lo que ronda.** Su IA va a los ruidos y busca camino: la puerta de un refugio es un muro también para
  él.
- **El rendimiento.** Veinte criaturas más y una docena de llamas: cada casa con su grupo para el descarte (como las del
  barrio), y la luz de las ventanas, una superficie que brilla, no una luz más.
- **El final.** El cruceiro se queda como está (es del final secreto). La película del jefe final pasa por la Herrería
  (el acto 3): si la fragua se hace refugio, su fachada es también la de la película.
