# Los refugios: los lugares cerrados que se hacen tuyos (plan)

Propuesta del 25 de noviembre de 2026, a partir de lo que pidió el autor, y rehecha el mismo día con su respuesta:
**valen torres y edificios de dos o tres plantas, se puede rehacer o añadir lo que haga falta, y tienen que ser lugares
cerrados**. **Sustituye a los altares de descanso.** **No está hecha**: espera a lo que queda por decidir (§12). Va
antes que la fragua y el alfaqueque (la propuesta del herrero de Évora y del mercader, del mismo día, que todavía no
tiene plan propio): los dos se apoyan en esto (§9).

Lo que pidió el autor:

- Los sitios de descanso dejan de ser capillas y altares: pasan a ser **casas abandonadas**, con criaturas dentro
  (llenas, o con las que sean razonables). **También torres y edificios de dos o tres plantas.**
- **Hay que asegurarlos**: tienen puertas, y hay que abrirlas y cerrarlas; lo que haga falta para que el sitio quede
  cerrado. Como los sitios que se liberan en *Assassin's Creed*.
- **Tienen que ser lugares cerrados.** Si para eso hay que rehacer algo o añadir sitios, se hace.
- Que no vuelva a pasar que **reaparezcas a un metro de una criatura** porque el sitio no está bien cerrado.
- **Interiores con sentido.**
- **Lo de descansar cambia**: a veces, sencillamente, un rosario y una imagen de Dios en la pared, con luz cálida.
- En estos sitios se encuentra **oro, que es limitado**.
- Que el plan no se quede en eso: adaptarlo donde haga falta.

## 1. Lo que hay (medido)

Diez altares (`kind: 'altar'`): un altar de velas (`P.candleAltar`) y un punto donde se reaparece. Descansar cura,
rellena las ampollas, guarda y **devuelve a todas las criaturas a su puesto** (`game.restAt`); al morir se reaparece
en el último (`respawnAtAltar`). Medidos con dos herramientas nuevas: `tools/altares.mjs` (las criaturas más cercanas
al punto de reaparición, en su puesto, que es como quedan al descansar o al morir) y `tools/huecos.mjs` (por dónde se
pasa y por dónde se ve de dentro afuera, planta por planta):

| Altar | Dónde | ¿Está cerrado? | La criatura más cercana al reaparecer |
|---|---|---|---|
| Capilla de la guarnición | El castillo: el primero | No: un paso de 1,3 m sin hoja al patio | Un penitente a 7,7 m, en el patio, con el punto a la vista (comiendo: hasta que te mueves) |
| Oratorio de Santa Bárbara | El patio del Horno | No: un paso de 1,3 m sin hoja | A 21 m: el más tranquilo («ninguna criatura ronda el patio») |
| Cruceiro del Largo | En medio de la plaza | No: a la intemperie | **Un soldado cosido a 3,5 m que te percibe al aparecer**, y una Plañidera a 12,5 m que también. Sólo se enciende tras reventar el Turiferario, como punto de control del final secreto (sin enganchar) |
| Capilla de San Fructuoso | La calle de la Muralla | No: un paso de 1,8 m sin hoja | Un soldado a 16 m, fuera |
| Oratorio de la cerera | El barrio, en el sobrado de su casa | Casi: tres puertas con hoja, pero seis ventanas y dos vanos del balcón | Ninguna en su planta a menos de 40 m |
| Altar de la cripta | Bajo la Sé, en la sala de llegada | No: abierta 5 m al osario, y la escalera de la nave | Un soldado a 15 m, y el Campanero, que ronda, a 19 |
| Capilla de San Martín | La cripta honda | No: abierta de lado a lado a la cripta (6,8 m) | Dom Paio (amigo) a 4,5 m; la primera hostil, a 33 |
| Oratorio de San Pedro de Rates | Las catacumbas, el lucernario | No: un cruce, con seis pasos y un vano | **Una emparedada a 5,8 m que te percibe al aparecer** |
| Capilla Real | La fortaleza | Dos puertas con hoja que, abiertas una vez, ya no se cierran | **Un cortesano de rodillas a 4,8 m que te percibe al aparecer**, dentro de la capilla |
| Torre de la coracha | La fortaleza, sobre las cámaras del Rey | No: un hueco de 2,5 m sin hoja a la coracha, y la escalera | Un soldado a 11,6 m, a su misma altura, que llega andando en 15; y tres a 9–10 m, una planta más abajo |

Lo que sale de ahí:

- **En tres reapareces junto a una criatura que te percibe** (el cruceiro, Rates y la Capilla Real). En la capilla
  del castillo, un penitente te tiene a la vista a 7,7 m; en la coracha, un soldado llega andando en 15 m.
- **Ninguno está cerrado.** Siete tienen un paso sin hoja o están abiertos de lado a lado, y el cruceiro está a la
  intemperie; la cerera tiene ventanas y vanos por los que se ve; la Capilla Real se queda abierta en cuanto la abres. Lo que hoy los hace seguros es dónde
  están puestas las criaturas, no los muros: lo que ronda (el Campanero de la cripta, la Plañidera de las catacumbas)
  llega igual.
- **Hoy ninguna puerta se vuelve a cerrar.** Una puerta que se abre se queda abierta para siempre (`setOpen`, la
  bandera `door:<id>`). Las únicas que se cierran son las de un guion: las cuarentenas del Físico (`tapiar`) y el
  portazo de la bodega del canónigo (`slamShut`).
- **Descansar rellena también lo de dentro**: si limpias la sala del altar, al descansar vuelve todo.
- **Hay zonas grandes sin ningún sitio de descanso**: lo hondo entero (la lobera, las cloacas viejas, los aljibes, lo
  hondo y el Sumidero: más de 15.000 m² y 33 criaturas); el Postigo (el Empalado, el callejón y la Casa del Alemán: el
  altar de superficie más cercano, San Fructuoso, queda a 84 m del Empalado y a 120 de la casa, en línea recta); y el
  ala de poniente de la fortaleza (la Corte de los Infieles, la cocina, la despensa, la reina: a 60–80 m de la Capilla
  Real).
- **Al descansar, el Condenado se arrodilla**: la animación (`clips.rest`, en `entities/weapons.js`) es una
  genuflexión, con una rodilla en el suelo. Es el que escribió NO TE ARRODILLES por las paredes y el que, en el final,
  «no se arrodilla» (`PLAN_FINAL.md`, plano 11).

**Lo que ya está cerrado hoy** (`tools/huecos.mjs`, sin un solo paso, vano ni ventana; sólo puertas con hoja y, en las
torres, la escalera):

- **la torre de la cárcel** (una puerta al patio; dentro, la escalera de las mazmorras y, por una trampilla, la sala
  de los guardas);
- **la Cancillería y las cuatro plantas de la Torre del Tombo** (dos puertas la sala; una cada planta);
- **la despensa** de la fortaleza (cuatro puertas, una de ellas la poterna, atrancada);
- **la cámara de arriba de la torre de la reina** (sólo su escalera);
- **la capilla de Sisnando** (una: el tabique que se derriba);
- **dos de las plantas de la torre del homenaje**, la del almacén y la del consejo (sus puertas y el caracol; la de la
  guardia, no: tiene un paso de 1,8 m al patio);
- y la Casa del Canónigo (dos puertas), que no sirve (§8).

Con un solo paso sin hoja: la tintorería, el cuartel, el obrador de la tejedora, la carpintería del Postigo, la capilla
de la guarnición, Santa Bárbara y San Fructuoso. Abiertos de verdad: la sala de llegada de la cripta, San Martín, el lucernario de
Rates, lo bajo de la torre de la reina (8,3 m abiertos al estrado), el osario de Bento (tres bocas de 3 m) y el Vergel.

Lo que ya está y sirve:

- **La Casa del Alemán** (`game/house.js`) es un refugio hecho a mano, una vez: las contraventanas que las criaturas
  revientan para saltar dentro, la defensa por oleadas y el tapiar cada ventana con martillo, clavos y un tablón para
  «hacer de la casa un sitio seguro».
- **Las puertas**: las atrancadas por un lado (`lock: 'barred'`), las clavadas que se arrancan con la palanca
  (`'boards'`), los tabiques que se derriban (`tabique`) y las que un guion vuelve a cerrar con su navegación
  (`slamShut`, `tapiar`, `refreshDoorNav`: en el barrio, una puerta cerrada ya es un muro para las criaturas).
- **El ruido** (`game.noise`): arrancar unas tablas o reventar algo despierta a las que oyen y las manda a ver (y al
  Físico, que lo oye todo).
- **La imagen** (`imagenSanto`, en `world/mobiliario.js`): una tabla pintada clavada al muro con su repisa de velas,
  con dos pinturas hechas (`animasRetablo`, `virgenCarmen`). **El rosario** del canónigo tiene su modelo
  (`game/interact.js`).
- **Las casas del barrio** (`world/kit_casa.js`): de varias plantas, con escaleras de verdad, forjados, desván y
  tejados que se andan.
- **El mapa** dibuja lo de las zonas visitadas (`game.visited`) y ya tiene un icono para los altares.

## 2. La idea

La noche de la campana, los que no se arrodillaron en la calle se encerraron donde pudieron: en sus casas, en las
torres, en cualquier cuarto que tuviera una puerta. Lourenço lo dejó en su libro: «Los de la casa de enfrente se han
encerrado con sus muertos y han clavado la puerta. Van de una casa a otra por dentro, y por los tejados». El tabernero
atravesó una mesa en la cocina y cerró la bodega; Henrique se atrancó arriba; Joana clavó su herbolería; los guardas
de la cárcel subieron a su sala y cerraron la trampilla. Algunos aguantaron unas noches. Ninguno aguantó: lo de fuera
se les metió dentro, o se les levantó dentro. Quedan sitios cerrados por dentro, con los suyos todavía en ellos y, en
un rincón, la imagen a la que rezaban y una lamparilla apagada.

**Un refugio es uno de esos sitios, recuperado.** Entras como puedes, lo limpias, lo cierras y enciendes la
lamparilla. Desde entonces es tuyo: ahí descansas, ahí te levantas, y ahí no entra nada.

### Lo que es un lugar cerrado (la regla)

1. **Muros por todos lados y techo encima** (forjado, bóveda o tejado). Ni patios, ni salas abiertas a la luna, ni
   capillas abiertas a la nave.
2. **Todo hueco por el que se pasa tiene algo que lo cierra**: una puerta con su hoja, que se abre y **se vuelve a
   cerrar**; una trampilla; y donde había un arco o un boquete, un cancel de tablas con su puerta, una tapia o un
   derrumbe.
3. **Las ventanas, con su contraventana cerrada o tapiadas.** Una reja sola no vale: se ve y se oye a través.
4. **Dentro, de una planta a otra, todo abierto; lo que sale fuera, cerrado**: la escalera de una torre que sigue
   subiendo, el caracol, la escalera de las mazmorras, con su puerta o su trampilla.
5. **Se comprueba**: con el refugio cerrado, `tools/huecos.mjs` no encuentra ni un paso, ni un vano, ni una ventana
   por la que se vea; y `tools/refugios.mjs`, lo del §7.

### Lo que puede ser un refugio

- **Una casa**, de una a tres plantas.
- **Una torre**, entera o una planta suya cerrada por su escalera: la de la cárcel, la del Tombo, la de la reina, la
  de la coracha, la del homenaje.
- **Un edificio de oficio** (la taberna, la tintorería, la fragua) o **una sala de palacio** con sus puertas (la
  Cancillería, la despensa).
- **Bajo tierra, un cuarto con su puerta**: una capilla con su cancel, una celda, la cámara de las aguas.

### Por qué funciona

- **La seguridad la dan los muros, no el reparto.** Reaparecer junto a una criatura deja de poder pasar (§7).
- **Cada refugio es un nivel pequeño**: una a cuatro plantas, dos o tres maneras de entrar, los que había dentro, una
  historia y su oro. Lo de los sitios que se liberan en *Assassin's Creed* o los puestos de *Far Cry*, a la escala de
  una casa o una torre, y con miedo.
- **Encaja con lo que ya se cuenta**: el libro de Lourenço, la casa tapiada, la mesa del tabernero, Henrique, el Físico
  que pone en cuarentena las casas del barrio.
- **Se ve lo que es tuyo**: cada refugio encendido deja luz en sus ventanas, y la ciudad se va llenando de tus luces.
- **La ironía se afila**: te levantas bajo la imagen de un santo, y no es el santo quien te levanta (Dom Paio: «Reza
  por que sea el santo quien te levanta»; `PLAN_FINAL.md`, §1.2).

## 3. Cómo se hace tuyo un refugio

1. **Verlo.** Desde fuera se distingue de lo de adorno, como ya se distinguen las casas que se visitan: está cerrado
   **por dentro** (las tablas de las ventanas, clavadas por el lado de dentro: lo contrario de las cuarentenas del
   Físico, que clavan por fuera y llevan su cruz de cal) y en la aldaba cuelga, seco, **el ramo de olivo** del Domingo
   de Ramos, el que se guardaba en casa para que no entrara el mal. En el mapa sale como un refugio sin encender.
2. **Entrar.** Cada uno tiene dos o tres entradas, y elegir es lo que lo hace un pequeño puesto que asaltar:
   - **la puerta principal**, atrancada por dentro: por ahí no; será la tuya;
   - **la de atrás** (al corral, al callejón, a la poterna), clavada: con la palanca y **con ruido** (`game.noise`):
     todos los de dentro despiertan y van a ver;
   - **una ventana de arriba**, subiendo por un carro, un tejadillo o una escalera de mano: **en silencio**, y se les
     coge de uno en uno;
   - **por los tejados** (en el barrio, por su desván), **por arriba** (en una torre, desde el adarve) o **por debajo**
     (la trampilla de una bodega que da a las cloacas).
3. **Limpiarlo.** Dentro, los suyos: de ninguna criatura (un sitio vacío que se siente mal) a cinco o seis, puestas con
   sentido: el padre de rodillas ante la cuna vacía, la abuela rezando de cara a la pared, el perro royendo, la hija en
   la ventana, el rastrero en el techo de la alcoba, el guarda que sigue sentado junto a la trampilla. Las de un refugio
   son **de ese sitio**: muertas, no vuelven nunca (hoy, al descansar, vuelve todo).
4. **Cerrarlo.** Cada hueco cuenta, y en pantalla se lleva la cuenta, como las ventanas de Henrique («Huecos: 2 de 4»):
   - **una puerta**: se cierra y se le echa la tranca (si la reventaste, se apuntala con un tablón);
   - **una ventana rota**: se tapia con martillo, clavos y un tablón, como en la Casa del Alemán; una con contraventana,
     se cierra. Los sitios con ventanas rotas esperan al martillo: una puerta natural en la progresión;
   - **la trampilla** del desván, de la bodega o de la escalera de una torre: se le echa el cerrojo;
   - **la escalera de mano** de una ventana: se sube.

   **Las puertas de un refugio se abren y se vuelven a cerrar**, todas (hoy ninguna lo hace). **La principal pasa a
   ser la tuya**: su llave está dentro (colgada de un clavo, en el arca, en el cinto del que la guardaba); desde
   entonces se entra y se sale por ella, y se cierra sola detrás de ti (echas la llave al pasar). Todas las llaves van
   en **un llavero**, que no llena el inventario. Las demás se abren desde dentro y se cierran detrás: son atajos de un
   solo sentido, como las atrancadas de ahora.
5. **Encender la lamparilla.** En el rincón de la imagen (§5), con el farol, como los braseros de la lobera. Al
   prenderse, la luz cálida llena el cuarto, suena el tema del refugio, se guarda la partida y el refugio queda
   encendido. Desde entonces: «Descansar».
6. **La primera noche** (sólo en dos o tres): al encender, algo viene. Una oleada corta contra la contraventana que no
   reforzaste, como la defensa de Henrique, para que se sientan los muros que acabas de cerrar. En la taberna (el primer
   refugio grande de la ciudad), en la Casa del Alemán (que ya la tiene) y, si se aprueba, en la fragua.

## 4. Lo que da un refugio

- **Descansar**, como hoy: la vida, el aliento, las ampollas, la partida guardada y las criaturas **de fuera** a su
  puesto. Dentro no vuelve nada.
- **Levantarse ahí**: al caer, despiertas dentro, delante de la imagen, con todo cerrado. Lo más cercano que haya está
  al otro lado de un muro (§7).
- **Su oro** (§6).
- **Lo que cuenta**: quién se encerró ahí, en un documento o en el sitio mismo.
- **Un atajo**: cada refugio abre algo hacia el resto del mapa: su puerta de atrás a otra calle, un paso a la casa de al
  lado (el armario sin fondo del Físico, pendiente en el pulido de la hoja de ruta, es exactamente esto), la salida al
  tejado o al adarve.
- **La vista** (en los que tengan ventana alta, desván o terraza, a lo *Assassin's Creed*; en las torres, sobre todo):
  desde ella se ve el barrio, y el mapa se rellena alrededor (sus zonas pasan a `visited`).
- **Luz en las ventanas**: desde la calle, y de lejos (como la vela del Rey, `game/hitos.js`), las ventanas de un
  refugio encendido son cálidas.
- **Lo que te persigue se queda fuera**: si entras con algo detrás, la puerta se cierra y se queda aporreándola (la
  pose `pound`, la de la Casa del Alemán) hasta que se cansa y vuelve a su puesto. Como las salas seguras de *Resident
  Evil*.
- **En las cuentas del final** (el tiempo, las muertes, los documentos), los refugios encendidos.

## 5. La imagen, el rosario y la lamparilla (lo que sustituye al altar)

Los altares de velas dejan de ser donde se descansa (los de las capillas se quedan, de adorno). En cada refugio, **el
rincón de la imagen**, lo que rezaban los que se encerraron. Siempre tres cosas:

- **La imagen**, en el muro: lo que cada sitio tuviera.
  - En las casas de los oficios, **una tabla pintada** (`imagenSanto`), románica, como se pintaba en 1167: **Cristo en
    majestad** (el Pantocrátor, con el libro y la mano alzada), **Santa María sentada con el Niño en las rodillas**,
    **San Geraldo** (el arzobispo de Braga que murió en olor de santidad hace casi sesenta años) o el santo del gremio.
  - En las pobres y en los cuerpos de guardia, **una cruz de dos palos atados**, o grabada a punta de cuchillo en la
    pared, y el ramo de olivo.
  - En las de los ricos y en los palacios, **un crucifijo tallado** sobre la cama o **una hornacina** con el santo de
    bulto (como San Eloy en la fragua).
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

**Cuánto.** Lo que tendría cada sitio: poco en las casas de los oficios, más en las de los ricos. **Es limitado**: el
total del mundo es fijo, ninguna criatura lo suelta y nada vuelve. Como orden de magnitud, **unos 250 morabetinos en
todo el juego**, algo más de la mitad en los refugios. Los precios (del plan de la fragua y del alfaqueque) se ponen
para que **el oro del mundo pague más o menos el 60 % de lo que se vende**: hay que elegir. Al morir no se pierde. Se
lleva la cuenta en el inventario y, al encontrarlo, un aviso («+6 morabetinos»).

| Refugio | Lo que guardaban | Morabetinos (orientativo) |
|---|---|---|
| La torre de la cárcel | La bolsa de los guardas, lo que cobraban a los presos por una manta o una vela | 4 |
| La Taberna del Cuervo | Lo que el tabernero no se atrevió a gastar, en una olla bajo el hogar | 10 |
| La tintorería | El oro de la grana, que se pagaba caro, tras la imagen | 15 |
| La casa de la cerera | Lo que le dejó el marido, cosido en una saya | 8 |
| La Casa del Alemán | Lo que el padre de Henrique guardaba para volver a Colonia (te lo da él) | 20 |
| La capilla de Sisnando | Lo que los fieles echaban por el ventanuco de la reclusa | 6 |
| La capilla de San Martín | Nada: Dom Paio lo dio todo | 0 |
| La celda del enterrador | Lo que les quitaba a los muertos | 10 |
| La Cancillería y el Tombo | Los derechos del sello, en un arca del Tombo | 25 |
| La despensa | La sisa del despensero | 8 |
| La cámara de la reina | La limosna de la reina | 12 |
| La torre de la coracha | La limosna del Rey | 12 |
| La choza del Desfigurado | Nada que le importe: dos monedas en un tarro | 2 |
| La casa del sepulturero | Las monedas de la boca de los muertos de la fosa de los pobres | 15 |
| La cámara de las aguas | Las que se echaban a las fuentes de la ciudad, que el agua junta aquí | 10 |
| **Fuera de los refugios** | El tesoro del camarero (40), la alberca (10) y los Paços (50, si se aprueban) | 100 |

## 7. La regla: que nunca aparezcas junto a una criatura

1. **Dentro de un refugio asegurado no hay ninguna criatura**: las suyas no vuelven (`refugio:<id>`) y ninguna otra
   tiene su puesto dentro.
2. **Sus puertas, sus ventanas tapiadas y sus trampillas son muros** para la navegación de las criaturas, como las
   puertas del barrio (`refreshDoorNav`). Nada atraviesa la puerta de un refugio: ni el Físico, que va a los ruidos y
   entra por las puertas que abres, ni lo que te persigue.
3. **Está cerrado** (§2, la regla del lugar cerrado): `tools/huecos.mjs`, con todo cerrado, no encuentra ningún hueco.
4. **El punto donde te levantas**, dentro y delante de la imagen: ninguna criatura en su planta a menos de 12 m sin una
   puerta cerrada en medio, ninguna lo ve (la línea de vista desde sus ojos) y ninguna llega andando.
5. **`tools/refugios.mjs`** (nuevo, a partir de `tools/altares.mjs` y `tools/huecos.mjs`): para cada refugio, lo
   asegura (sus banderas), comprueba que está cerrado, pone al jugador en el punto, comprueba lo de arriba, deja correr
   veinte segundos con todas las criaturas y comprueba que no entra nadie. Entra en las pruebas largas (la fase de
   «Pruebas y fallos»).

## 8. Refugio por refugio

Quince, donde había diez altares, y tres más que dependen de otros planes. Ordenados por lo que hay que hacer en cada
uno: **ya cerrados** (sólo la gente, la imagen, el oro y que sus puertas se vuelvan a cerrar), **piden puertas** (los
huecos sin hoja) y **piden obra** (cerrar lo abierto o levantar un sitio nuevo). «Hoy», lo medido con
`tools/huecos.mjs`.

**Ya cerrados (seis)**

| | Refugio | Dónde | En lugar de | Plantas | Hoy | Dentro | Lo que tiene |
|---|---|---|---|---|---|---|---|
| 1 | **La torre de la cárcel** | El castillo: la salida de las mazmorras (`torre_carcel`) | La capilla de la guarnición | Dos | Cerrada: su puerta al patio; dentro, la escalera de las mazmorras y la trampilla de arriba | Hoy nadie: los dos guardas | El primero, el que enseña. Se cierran la puerta del patio (la tuya) y la de abajo de la escalera de las mazmorras (nueva); la imagen, arriba, en la sala de los guardas. La primera casa que haces tuya es la de tus carceleros. La capilla se queda, de adorno |
| 2 | **La Cancillería y la Torre del Tombo** | La fortaleza, junto a la capilla (`cancilleria`, `tombo_*`) | La Capilla Real | Una y la torre, de cuatro | Cerradas: dos puertas la sala, una cada planta de la torre | Hoy dos en la torre: más tres escribanos en la sala | Una sala y una torre de cuatro plantas por su caracol. Se cierran la puerta de la galería (la tuya) y la de arriba del Tombo. La caldera de la cera da la luz cálida; desde lo alto, el patio entero |
| 3 | **La despensa** | La fortaleza, ala de poniente (`despensa`) | Nuevo | Una | Cerrada: cuatro puertas (la poterna, atrancada) | Hoy un penitente: dos o tres | Antes de la Corte de los Infieles: el último descanso antes del salón. La tablilla del despensero |
| 4 | **La cámara de la reina** | Lo alto de la torre de la reina (`reina_camara`) | Nuevo | La de arriba de las tres | Cerrada: sólo su escalera | Hoy una Plañidera: dos | Se cierra con una trampilla en la escalera (nueva). Cubre el ala de poniente |
| 5 | **La capilla de Sisnando** | Bajo la Sé, entre el panteón y el templo romano (`capilla_sisnando`) | El altar de la cripta | Una | Cerrada: un tabique, que se derriba para entrar | La reclusa emparedada | La tapiaron con él; ahora la tapias tú: el boquete del tabique, con tablones, por dentro. Cerca del panteón, del templo romano y de la Puerta |
| 6 | **La Casa del Alemán** | El Postigo (`casa_aleman`) | Nuevo | Dos y sótano | Casi: la puerta reventada, cinco ventanas abajo y siete arriba | La defensa de Henrique, como está | Al tapiar las cinco ventanas de abajo pasa a ser refugio, con Henrique dentro; las de arriba, con contraventana. El altarcillo de su padre. Cubre el Postigo y el Empalado |

**Piden puertas (cuatro)**

| | Refugio | Dónde | En lugar de | Plantas | Hoy | Dentro | Lo que pide |
|---|---|---|---|---|---|---|---|
| 7 | **La Taberna del Cuervo** | Entre el Soto, la plaza y el callejón (`taberna`) | El Oratorio de Santa Bárbara | Una y la bodega | Tres pasos de 1,3 m sin hoja (al arco, al Soto, a la plaza) y la trampilla | Hoy dos: tres | Tres puertas con su hoja (una, la tuya) y el cerrojo de la trampilla. La mesa de la cocina se rompe, como ahora. El tabernero ya lo intentó: terminas lo que él empezó. Su primera noche. La trampilla baja a la cloaca, y de ahí al Vergel |
| 8 | **La tintorería** | La calle de los tintoreros (`tintoreria`) | San Fructuoso | Una y el secadero de las telas (nuevo) | Un paso de 1,3 m sin hoja al patio | Hoy una Plañidera: tres | La hoja de su puerta y, si se hace, el secadero de arriba con su escalera. Entre la plaza, la casa del canónigo y la muralla. San Fructuoso se queda como capilla |
| 9 | **La casa de la cerera** | El barrio (`viuda`) | Se queda (su oratorio) | Dos y desván | Tres puertas con hoja; dos vanos del balcón y seis ventanas por las que se ve | Hoy nadie: dos o tres | Las contraventanas de las seis ventanas y las hojas de los dos vanos del sobrado. Velas por todas partes: era cerera |
| 10 | **La torre de la coracha** | La fortaleza, sobre las cámaras del Rey (`coracha_torre`) | Se queda | Una | Un hueco de 2,5 m sin hoja a la coracha y la escalera del oratorio del Rey | Hoy nadie: una | Una puerta a la coracha y una trampilla en la escalera. Cubre las cámaras del Rey |

**Piden obra (cinco)**

| | Refugio | Dónde | En lugar de | Hoy | Lo que pide | Dentro | Lo que tiene |
|---|---|---|---|---|---|---|---|
| 11 | **La capilla de San Martín** | La cripta honda (`capilla_martin`) | Se queda | Abierta de lado a lado a la cripta (6,8 m) | **Un cancel de tablas**, de muro a muro, con su puerta: lo que las iglesias ponían para cerrar una capilla | Dom Paio | El único con alguien vivo dentro. Cuando Dom Paio falte, sigue siendo tuya |
| 12 | **La celda del enterrador** | Las catacumbas, junto al lucernario (nueva) | El Oratorio de San Pedro de Rates | Un cruce: seis pasos y un vano | **Una celda nueva** con su puerta, excavada en la roca, junto al cruce: el jergón, las palas, la tabla de los enterramientos | Dos (un cavador y lo que se meta con él) | El oratorio se queda, de adorno; la emparedada, donde está. Cubre las catacumbas, los Inocentes y la Garra |
| 13 | **La choza del Desfigurado** | El Vergel, en el rincón del suroeste (nueva) | Nuevo | Su botica es un rincón tras una mampara de cañizo, en una sala de 900 m² abierta a la luna | **La choza**: muros de cañizo y barro de pilar a pilar y hasta la bóveda, su puerta de tablas y un ventanuco con un lienzo encerado. La levantó él | Él | No hay nada que limpiar: te deja entrar cuando le has hablado, y encender su candil. Cubre la cloaca y el Vergel |
| 14 | **La casa del sepulturero** | La lobera, el osario de Bento (`lobera_osario`) | Nuevo | Tres bocas de 3 m a las galerías | **Dos bocas tapiadas** (con piedra y huesos, como tapiaba él los nichos) y **la tercera, con su puerta** | El Lobishome | Tras vencerle: su cama de paja, su pala y su farol. El refugio de las cloacas hondas |
| 15 | **La cámara de las aguas** | Lo hondo, entre los aljibes y el ninfeo (nueva) | Nuevo | No hay nada | **Una cámara nueva**: el *castellum* de los romanos, donde se repartía el agua de la fuente; abovedada, con su puerta de bronce y las bocas de las cañerías | Dos o tres de las de lo hondo | El refugio de lo más hondo, para los aljibes, lo hondo y el Sumidero |

**Los que dependen de otros planes**

| | Refugio | Dónde | Plantas | Lo que pide |
|---|---|---|---|---|
| — | **La fragua** | La Herrería | Dos (el sobrado) | La misión «Una fragua con puertas» (§9): el portalón, las ventanas, la puerta de atrás y la trampilla del sobrado |
| — | **La planta de la guardia de la torre del homenaje** (opcional) | La fortaleza (`homenaje_guardia`, `homenaje_dormitorio`) | Una de las seis de la torre | Su puerta a la escalinata y la del caracol. Hoy tres soldados. Antes del Rey y del Caballero, si después de medir hace falta |
| — | **Una casa de los Paços** | La Cerca (la de las dueñas) | Dos | Sus puertas; en lugar del altar de su capilla (`PLAN_PACOS.md`, P3) |

**Lo que se descartó, y por qué**

- **La Casa del Canónigo** está cerrada (dos puertas), pero encima de la caza del Descoyuntado, que te encierra en las
  bodegas echando la tranca desde arriba: un refugio no puede tener a alguien dentro que te cierre la puerta.
- **El cuartel y la capilla de la guarnición** (un paso cada uno): la torre de la cárcel ya está cerrada y es por donde
  se sale de las mazmorras.
- **La sala de llegada de la cripta**: abierta 5 m al osario y a la escalera de la nave; la capilla de Sisnando, a
  unos 37 m, ya está cerrada.
- **Lo bajo de la torre de la reina**: abierto 8,3 m al estrado de las damas; arriba, la cámara está cerrada.
- **Las torres del adarve norte**: son el camino de la huida de la Bestia de Carne (`game/beast_chase.js`); un sitio
  donde descansar en medio de una persecución, no.
- **El cruceiro del Largo no es un refugio**: es el punto de control de la pelea contra Deo Ignoto, que sólo hay en el
  final secreto, y no está enganchado. Se queda fuera de este plan. Cuando se enganche (con la espada,
  `PLAN_ESPADA.md`), que no sea en medio de la plaza con el Largo poblado: hoy reaparecerías a 3,5 m de un soldado.

**Lo que hay que construir**, junto:

- **Puertas que se abren y se vuelven a cerrar**, con su tranca por dentro, en todos los refugios; y la de la llave,
  que se cierra sola detrás.
- **Hojas nuevas**: las tres de la taberna, la de la tintorería, la de la coracha a la coracha, las de los dos vanos
  de la cerera, la de abajo de la escalera de las mazmorras; **trampillas**: la de la torre de la reina y la de la
  coracha; **contraventanas**: las seis de la cerera y las siete del sobrado del Alemán.
- **Obra**: el cancel de San Martín, las dos tapias y la puerta del osario de Bento, y tres sitios nuevos: la celda del
  enterrador, la choza del Desfigurado y la cámara de las aguas (y, si se quiere, el secadero de la tintorería).

## 9. Con la fragua y el alfaqueque

- **La fragua es un refugio más.** La misión «Una fragua con puertas» de la propuesta del herrero es su ciclo: cerrar
  el portalón con su tranca (la que se llevó Henrique para su puerta), tapiar las ventanas, hacer tuya la puerta de
  atrás, cerrar la trampilla del sobrado al tejado, sacar a Lourenço del fuego y encender la lamparilla bajo San Eloy.
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
| `game/interact.js` | Las puertas, que abiertas una vez se quedan abiertas (`setOpen`) | Las de los refugios se abren y se vuelven a cerrar, con su tranca; la de la llave, que se cierra sola detrás; la trampilla con cerrojo y la escalera que se sube; la navegación, al día en cada cambio |
| `game/game.js` | `restAt`, `respawnAtAltar`, `lastAltar` | Descansar ante la imagen; levantarse en el último refugio; las criaturas de un refugio asegurado no vuelven |
| `game/house.js` | Las contraventanas, los tablones y la defensa de Henrique | Se sacan a un módulo de refugios (`game/refugios.js`) que usan todos; la Casa del Alemán, la primera que lo usa tal cual |
| `world/level_castle.js`, `level_barrios.js`, `level_city.js`, `barrio_casas.js`, `fortaleza_rey.js`, `fortaleza_reina.js`, `level_crypt2.js`, `lucernario.js`, `vergel.js`, `cloacas_hondas.js` | Los huecos sin hoja y lo abierto (§8) | Las hojas, trampillas, contraventanas, el cancel, las tapias y los tres sitios nuevos |
| `entities/weapons.js` | `clips.rest` (de rodillas) | Sentado contra la pared, si se aprueba |
| `game/story.js` | `MSG.rest`, los avisos, los nombres de las zonas | El texto nuevo, un documento por refugio (quién se encerró ahí) y el morabetino |
| `game/ui.js` | El mapa (el icono del altar) y el inventario | El refugio visto y el encendido; el oro y el llavero |
| `core/audio.js` | La capa del altar (lo que suena cerca de un altar) | La lamparilla y el tema del refugio |
| `dev/devmode.js`, `dev/instances.js` | Ir a cada altar; el cruceiro | Ir a cada refugio, y asegurarlo de un golpe |
| `tools/progress.mjs`, `barriowalk.mjs`, `fortalezawalk.mjs`, `uishots.mjs`, `circula.mjs` | Usan los altares por su id | Los refugios |
| `README.md` | «altares de descanso que curan…», «Los altares de descanso están en lugares a salvo…» | Los refugios |
| `PLAN_PACOS.md` | «la capilla de la guarnición (el primer altar)», «la capilla (el altar)» | El primero, la torre de la cárcel; el de los Paços, una casa |
| `PLAN_FINAL.md` | — | Sólo si se aprueban las luces del final (§10) |

## 12. Lo que tiene que decidir el autor

**Decidido el 25 de noviembre**: los refugios son **lugares cerrados**; valen casas, torres y edificios de dos o tres
plantas; se rehace o se añade lo que haga falta.

1. **¿Esta lista (§8)?** Quince, y tres que dependen de otros planes. Sobre todo: los tres sitios nuevos (la celda del
   enterrador, la choza del Desfigurado, la cámara de las aguas) y si la torre del homenaje lleva uno.
2. **¿Se sienta o se arrodilla al descansar?** Se recomienda que se siente.
3. **¿La primera noche**, una oleada al encender: en dos o tres refugios (recomendado), en ninguno o en todos?
4. **¿El oro son morabetinos, unos 250 en todo el juego?** ¿Y se puede encontrar antes de que estén el herrero y el
   alfaqueque, o entra con ellos?
5. **¿Viajar entre refugios?** Se recomienda que no, y decidirlo al medir la partida.
6. **¿Algo del §10?** Las luces del final, la cruz de cal del Físico, el tema propio.

## 13. Cómo se haría (si se aprueba)

| Fase | Qué |
|---|---|
| R1 | **El refugio, en uno**: el módulo (`game/refugios.js`) con sus estados (cerrado, limpio, asegurado, encendido), sus huecos, las puertas que se abren y se vuelven a cerrar, la de la llave, las criaturas de dentro que no vuelven, la navegación, levantarse dentro y la cuenta de los huecos en pantalla; el rincón de la imagen (la cruz, el rosario y el candil, con su luz) y el descanso (sentado, si se aprueba). En la torre de la cárcel, que ya está cerrada y es la primera |
| R2 | **La regla y su prueba**: `tools/refugios.mjs` (§7), con lo de `huecos.mjs`, y la tabla del §1 rehecha con los refugios |
| R3 | **Los ya cerrados**: la Cancillería y el Tombo, la despensa, la cámara de la reina, la capilla de Sisnando y la Casa del Alemán (de `house.js` al módulo, sin cambiar lo de Henrique). Fuera los altares de la Capilla Real y de la cripta |
| R4 | **Los que piden puertas**: la Taberna del Cuervo (con su primera noche), la tintorería, la casa de la cerera y la torre de la coracha. Fuera los de Santa Bárbara y San Fructuoso |
| R5 | **Los que piden obra**: el cancel de San Martín, la celda del enterrador, la choza del Desfigurado, la casa del sepulturero y la cámara de las aguas. Fuera el de Rates |
| R6 | **El oro**: el morabetino, los escondrijos y sus pistas, la cuenta en el inventario (con el plan de la fragua y del alfaqueque) |
| R7 | **Lo de todos**: el mapa, el modo de pruebas, los textos y el documento de cada refugio, el README, las partidas guardadas (§14), las pruebas largas, el teléfono y la versión jugable |

Pruebas: `refugios.mjs` (nueva), `huecos.mjs`, `progress.mjs` (la progresión entera, ahora de refugio en refugio),
`barriowalk.mjs`, `fortalezawalk.mjs`, `castlewalk.mjs`, `cryptwalk.mjs`, `cloacawalk.mjs`, `circula.mjs` (los muebles
nuevos no tapan el paso), `camclip.mjs` (la cámara en cuartos pequeños y en las torres), `salas.mjs` (la luz de la
lamparilla), `holes.mjs`, `zfight.mjs` y `rendimiento.mjs`.

## 14. Riesgos

- **La dificultad del principio.** Cada sitio de descanso cuesta ahora una pelea, y hay unas veinte criaturas más.
  Los dos primeros, fáciles; en todos, las razonables.
- **La progresión.** Algunos refugios son paso (la taberna une el Soto, la plaza y el callejón; la torre de la cárcel,
  las mazmorras y el patio; la despensa, el patio y el salón). Toda puerta de un refugio se abre desde dentro, y ningún
  camino que hoy se anda puede quedar cerrado por los dos lados (`progress.mjs`).
- **La obra bajo tierra.** La celda del enterrador, el cancel de San Martín y la cámara de las aguas van entre bóvedas
  y galerías que ya están medidas (`holes`, `zfight`, `hondasvoids`): cada pieza nueva, con sus pruebas.
- **La Casa del Alemán.** Su guion (`house.js`) es de lo más delicado del juego: se generaliza sin cambiar lo que pasa.
- **Las partidas guardadas.** Quien tenga como último altar uno que desaparece, se levanta en el refugio que lo
  sustituye, y ése se le da por asegurado y encendido: es donde ya descansaba.
- **El Físico y lo que ronda.** Su IA va a los ruidos y entra por las puertas que abres (en el barrio, una puerta
  abierta pasa a su red): la puerta cerrada de un refugio es un muro también para él.
- **El rendimiento.** Veinte criaturas más y quince llamas: cada refugio con su grupo para el descarte (como las casas
  del barrio), y la luz de las ventanas, una superficie que brilla, no una luz más.
- **El final.** El cruceiro se queda como está (es del final secreto). La película del jefe final pasa por la Herrería
  (el acto 3): si la fragua se hace refugio, su fachada es también la de la película.
