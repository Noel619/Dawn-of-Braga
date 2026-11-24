# El paciente que se le escapó

Hecho el 22 de noviembre de 2026. Lo que pidió el autor:

> El Físico va a ser un enemigo con potencial de cambiar partes de la historia. Por ejemplo, si logras evadir por
> completo su zona sin luchar o pelear contra él, volverá a aparecer cuando conozcas al tipo de las cloacas […] para
> asesinarlo por la espalda, en una escena que debería ser una referencia al final de Scarface. Para ese punto de la
> partida, sus conocimientos sobre todo esto son mucho más avanzados, e incluso ha empezado con la modificación de su
> propio cuerpo. Además de que también tiene a sus secuaces más entrenados, les da órdenes con la campana […]. Al
> mismo tiempo que aparece la cinemática en la que éste lo asesina, y el hombre raro cae por la cascada, detrás del
> doctor una bruma negra se expande. Y vienen monstruosidades.

Y después:

> Integramos que él baja a luchar en conjunto con sus secuaces. Pero va a pelear de forma inteligente. Ahora, más
> inteligente que nunca, está más liberado de su locura. Con el pasar de la batalla comprende que está posiblemente
> mal en su juicio, que puede que se esté equivocando en su teoría al ver lo que lo rodea (vida). Aun así, continúa
> peleando. Al llegar al final de la pelea, cuando está muriendo, cae de espaldas frente a la luna. La observa, y en
> sus últimos momentos de vida se da cuenta de todo. Trata de decírtelo, pero ya es demasiado tarde. Se ahoga en su
> propia sangre. Haz que todo tenga sentido con la historia y con el personaje.

«El tipo de las cloacas» es **el Desfigurado** (la cloaca bajo la plaza del Pan, la sala de la luz). Lo que sigue
cuenta cómo está hecho, por qué tiene sentido con él (§6), cómo se prueba y lo que queda por decidir (§10).

## 1. Evadir su zona: el otro camino

Hasta ahora el barrio de los Pellejeros no tenía otra salida que la llave de la cordelería, que se le quita al
Físico al vencerle. Ahora hay **otro camino**, que no pasa por él (`world/level_barrio.js`):

1. En la tintorería, en la primera planta, **el ventano de carga** de su fachada del norte (atrancado por dentro: se
   le quita la tranca).
2. Por él, **al tejado del almacén del cáñamo**, la nave de la cordelería que da al callejón.
3. En el faldón, **una trampilla clavada** (la de la garrucha con la que subían las balas de cáñamo): se arranca con
   la palanca y se baja por su escalera al almacén.
4. Del almacén, **por dentro de la cordelería** (el obrador de las sogas y la tienda) a su puerta de los Pelames,
   detrás de la barricada.

Por ese camino se puede salir del barrio en cualquier momento de la caza, sin la llave.

## 2. Se le escapa el paciente

`game/fisico.js`, `escapa()`. Al salir por la cordelería sin haberle vencido:

- **Si no le has tocado nunca** (ni en la calle ni en su sala: `fisico:pelea` sin poner y su vida entera) **se le
  ha escapado un paciente** (`fisico:escapado`): suena una campanilla, una vez, al otro lado de la cordelería; se va
  del barrio para siempre (no vuelve a cazarte ahí), y en su mesa de operar queda una nota, clavada con una lanceta:
  *«Se me ha ido un paciente. […] Nos veremos donde va el agua.»* (`NOTES.fisicoIda`).
- **Si le has herido**, no: se queda en su casa, esperándote, como siempre (`fisico:huido`).

Y **si aún no conoces al Desfigurado**, esa noche, en la cisterna, estará allí con él (`rama:cisterna`). Si ya le
conocías, el Físico se va del barrio y nada más (la nota lo dice: donde va el agua; §6).

## 3. Cambiado

`entities/fisico.js`. Para entonces sabe más (de ti: su historia clínica sigue apuntando; y de lo suyo) y ha
empezado a cambiarse a sí mismo (el grupo de piezas `evol`):

- **la corona**: un aro de hierro clavado al cráneo por encima de la máscara, con ocho varillas que acaban en
  campanillas de bronce tapadas con cera (para que no suenen: se acerca sin hacer ruido); clavos en las sienes;
- **la jaula del pecho**, cosida sobre el jubón;
- en la izquierda, en lugar de la mano, **una hoja de amputar** larga, sujeta al antebrazo con correas;
- y en la derecha, **la campanilla de las órdenes** (`campanillaR`).

De la corona le sale la bruma negra en hilachas. Allí arriba, en el pretil, es intocable: ni se le fija ni se le
hiere (`data.air`, como lo que va por el techo). Abajo, en el duelo, sí.

## 4. La noche de la cisterna

`game/fisico_rama.js` (la escena, la pelea y lo que queda), `game/bruma_negra.js` (la bruma),
`game/desfigurado.js` (dónde está él y cómo cae), `world/cloaca.js` (sus sitios).

**Él, en el pretil.** Esa noche el Desfigurado no está en la isla, en la luz: está arriba, **en el pretil del
rellano, sobre la cascada** (oye subir cascabeles por el canal y quiere verlos venir). La llegada (la toma que baja
del rellano) le encuentra allí; si le hablas, lo de siempre (la flor blanca, que sigas el agua) y, además: *«Esta
noche no bajo a la isla. Por el canal suben cascabeles.»*

**La escena** (27 s; se salta con la tecla de interactuar). Empieza al bajar a la sala, si ya le has visto (le
hayas hablado o no). Una cita del final de *Scarface*, sin decirlo: el hombre en lo alto, sobre la sala, con los
brazos abiertos; el que llega por detrás sin hacer ruido; la caída; el cuerpo boca abajo en el agua.

| s | Lo que pasa | La toma |
|---|---|---|
| 0 | Él, en el pretil, con los brazos abiertos, hablándole a la luz y a ti: *«¡Mira! Desde aquí arriba se ve todo.» «Aquí abajo no manda la peste. Lo que queda es de los que quedan.» «Y lo que queda, crece. Mira cómo crece.»* | Desde la sala, de lejos y desde abajo: él contra el arco de la galería, la cascada debajo |
| 4,4 | De lo oscuro de la galería sale el Físico, sin ruido, y se le pone a la espalda | De lado, a la altura del pretil: él predicando; detrás, la figura que se acerca |
| 8,5 | *«Hermosa...»*; la hoja le sale por el pecho | De frente: la cabeza enmascarada asoma por encima de la suya |
| 10,4 | Cae por la cascada, **a cámara lenta**, a la alberca: se le van las rodillas y se dobla sobre el pretil; en el aire gira entero, flojo, con los brazos y las piernas atrás, sacudiéndose, y la capa ondeando; da en el agua, se hunde un poco y sale | Desde la sala, siguiéndole |
| 13,6 | Boca abajo en el agua, que se tiñe, con los brazos abiertos pero sueltos, una pierna doblada, la cabeza de lado y la capa abierta flotando encima (el agua le mueve); arriba, el Físico se asoma al pretil a mirarle | Desde arriba (a ras del agua no se ve: la capa, oscura, de canto); luego la cámara se aparta y sube hasta él |
| 18,3 | El Físico, en el pretil: *«Éste ya no necesitaba médico. Ninguno lo necesita, al final.»* Detrás de él **la bruma negra** sale de la galería, cubre el rellano, cae por el pretil como una segunda cascada y se extiende por el suelo de la sala | La misma toma: él desde abajo, la bruma creciendo |
| 20,9 | *«Te fuiste por el tejado del cordelero sin dejarte tocar.» «Lo tengo apuntado. Aquí abajo también hay enfermos.»* | |
| 23,6 | Levanta la campanilla, tres veces; y de la bruma, por la escalera, **ellos** | La sala entera; la luz, al pie de la escalera |

(Hubo, en la primera versión, una frase rayada en la piedra junto a la boca de la cascada, que la escena enseñaba
al final: se quitó a petición del autor —no tenía sentido allí; la escena ya es la cita—.)

(La luz de la escena es la de la luna que rebota en el agua de la alberca: una sola luz fría, la del jefe de siempre,
`game.bossLight`, que ya estaba en la escena; no se añade ninguna, para no recompilar sombreadores.)

**La bruma negra** (`game/bruma_negra.js`) no es la niebla de los jefes, que es luz: es humo negro, que tapa. Seis
capas (la de la galería, dos sobre el rellano, la cascada negra y dos a ras del suelo, que crecen desde el pie del
rellano), su propio sombreador (ruido que corre, bordes deshilachados, la niebla de la escena) y sus hilachas de humo.
Durante la pelea **cierra las dos salidas** de la sala (lo alto de la escalera y la boca de la galería del desagüe)
con un muro que no se pasa (*«Bruma negra, espesa como el humo de un candil. Por ahí no se pasa.»*).

## 5. Sus monstruosidades: los Coronados de la bruma

`entities/coronado.js`, `CORONADO_BRUMA_TYPE`. Los mejores de su rebaño, los que se llevó: más curados todavía
(sobre la correa, un bozal de hierro; flejes en los antebrazos; los cascabeles, con cera negra, mudos; por los
agujeros del hueso les sale la bruma). Pelean mejor que los del barrio (120 de vida y 40 de aguante, más deprisa, el
garfio y el cabezazo un 25 % más fuertes, menos espera entre golpes), te ven y te oyen desde lejos, no avisan al
Físico del barrio, y **obedecen a la campanilla**:

- **una vez — «Cercadle.»**: te rodean a tres pasos, cada uno en su sitio (repartidos alrededor, empezando por donde
  ya están), de cara, y esperan; si te acercas a uno, te da con el garfio;
- **dos veces — «Sujetadle.»**: el que está más cerca va a por ti con el agarrón; los demás, en el cerco;
- **tres veces — «Ahora. Todos.»**: todos a una, sin respiro.

Las órdenes van **siempre en el mismo orden** (cerco, sujeción, carga, y un respiro a su aire), para que se aprendan;
con uno solo vivo, sólo la carga. Y **si uno te sujeta, las tres enseguida**: los demás se echan encima. Sin orden,
el agarrón es raro (uno cada diez segundos entre todos).

**La primera tanda**: tres, con él en lo alto, tocando y hablando (*«Despacio. Que no se escape otra vez.»*, *«No le
hagáis daño de más: es mío.»*…), **mirándote pelear y apuntándolo** (su historia clínica de ti sigue abierta). Cuando
de ellos queda uno (o se cansa de mirar): *«Basta de mirar.»*, y baja.

## 6. Él, abajo: el duelo

`game/fisico_duelo.js`. **Baja**: por el rellano, a lo alto de la escalera, se mete en su bruma (el muro no le para:
es suya) y sale por debajo, ya en la escalera. Su nombre, su barra, su música; de la bruma, **la segunda tanda**; y
él: *«Te he visto pelear con ellos. Ya sé cómo te mueves.»* (y, si lo tiene claro, lo que ha apuntado: *«Ruedas a tu
izquierda. Lo tengo apuntado.»*).

**Pelea con cabeza**, la misma que en su sala del barrio: la red entrenada (`fisico_mente.js`: elige cada 0,3-0,45 s
con lo que vio hace un cuarto de segundo, sostiene lo que decide, tiene aliento, amaga, retiene el golpe si te
adelantas, apunta adonde sueles rodar), con lo que es ahora:

- **zurdo**: la hoja de amputar delante y la campanilla a la espalda (la guardia de un esgrimidor; sus poses de
  siempre, al revés);
- sus golpes, **los del hierro con la hoja**: los tres tajos (los de la sierra, al revés), la lanceta y la estocada a
  fondo (el picotazo de la vara, al revés); para su cabeza, el segundo tiempo de su aforismo, el del hierro;
- y **piensa por los suyos**: si uno de ellos te tiene sujeto, va a por ti y **te remata como al otro** (la hoja, a
  fondo: el que tiene la sujeción eres tú; forcejea); las órdenes, **cuando le convienen**: si estás con uno de los
  suyos y él lejos, dos toques (que te sujeten, y viene); si estás con él, uno (que te cerquen: sin sitio para
  rodar); si bebes o te quedas sin aliento, tres; y **nunca con tu espada encima** (tocar le deja al descubierto).

**Y duda.** Lo que dice, por orden, según lo que ve y lo que le pasa (§7):

1. (cerca de la luz, o a los 18 s) *«Aquí abajo no ha entrado la peste.»*
2. (herido) *«La higuera busca el agujero. Las raíces, el agua. Aquí todo quiere algo.»* — y se para a mirar la luz.
3. *«Y no está enfermo.»*
4. *«Veintitrés rayas en el pilar. Veintitrés noches mirándolo crecer.»* — mirando la luz.
5. (cuando caen los suyos) *«Los míos no quieren nada. Tampoco crecen.»*
6. (con menos de la mitad) *«Si querer no es la enfermedad...»* — mirando la luz, más rato.
7. *«No. El tratamiento no se interrumpe.»* — **se rehace, y pelea más fuerte** (ve antes y elige mejor: para no
   oírse).
8. (al final) *«¿Por qué no te arrodillas? ¿Por qué no te has arrodillado nunca?»*

Cuando se para a mirar, nunca con tu espada encima: si estás a su lado, espera; y al rato lo dice sin pararse.

**Si caes**, vuelve a empezar al bajar a la sala, sin la escena: él en el pretil (*«Otra vez tú. Lo tengo
apuntado.»*), tres de los suyos, y baja enseguida.

## 7. Por qué duda (y por qué muere así)

Su tratado, *De peste sanorum*, dice que la peste es de los sanos: que los signos de la enfermedad son el miedo, el
pulso de pájaro, el correr, **el querer y el esperar** («la piedra de querer, la que hace que uno espere», que él saca
con el trépano), y que los que se arrodillaron la noche de la campana se curaron: **quietos, como los árboles**. A ti
te tiene apuntado como el caso más grave de la ciudad: **el único que no se arrodilló**. Y en la nota que dejó al
irse: «Allí abajo vive otro que se cree sano. Dice que la vida se escondió allí».

La cisterna le enseña lo contrario: los árboles de verdad no están quietos. La higuera crece hacia el agujero, las
raíces bajan al agua, las flores se abren a la luna; todo lo que vive ahí **quiere algo**, y está sano. Los suyos, sus
curados, no quieren nada, y tampoco crecen. Las veintitrés rayas del pilar son las noches que el otro, el que acaba de
matar, se pasó mirándolo crecer. Si querer no es la enfermedad, lo que él ha curado toda su vida era lo que estaba
vivo. No lo dice entero: sigue peleando («el tratamiento no se interrumpe»), porque pararse sería saberlo.

Y muere donde estaba siempre el otro: en la luz, mirando arriba. Sin la máscara (la que llevaba contra el aire malo,
que decía llevar ya dentro), ve la luna con sus ojos. Entiende: *todo se mueve hacia ella*; querer era estar vivo; y
tú, el que no se arrodilló, no eras el más enfermo: eras el único que... No llega a decirlo. La sangre, a media frase;
como el otro, que también murió en mitad de una palabra («Hermosa...»).

## 8. Su muerte, en la luz

`game/fisico_rama.js` (`empiezaMuerte`, `muerte`), `entities/fisico.js` (sus posturas). Vencido:

- se le cae **la campanilla** (suena una vez más) y, sin él, **los suyos se desploman** y **la bruma se deshace**;
- **anda como puede hasta la luz** (encorvado, la derecha apretada contra la herida, la hoja colgando; tose, gotea),
  donde estaba siempre el Desfigurado;
- **se quita la máscara** (la boca, por primera vez, al aire de aquí abajo) y **mira arriba**: la luna, por el
  agujero. *«Ah...»*;
- **cae de espaldas**, a cámara lenta, en la hierba de la isla, como cae un cuerpo que ya no se sostiene: se le van
  las rodillas, cae sentado, da con la cadera y luego con la espalda (la cabeza se le va atrás, los brazos caen
  abiertos, rebota un poco) y queda tendido, flojo: una rodilla levantada, un brazo por encima de la cabeza, el ropón
  caído a los lados de las piernas (la toma, desde arriba: la luna le mira a él). *«Todo se mueve hacia ella.
  Todo.»*;
- **vuelve la cara hacia ti** (la toma, a tu lado, a ras de la hierba): *«Tú no te arrodillaste.»* *«Tú eras el único
  que...»* — y la sangre: **se ahoga en ella**, a media frase;
- se queda quieto, la cara otra vez a la luna, los ojos abiertos; la cámara sube por la luz hasta la luna. Su nombre:
  ha caído.

**Su música** (`core/audio_music.js`; sus dos temas, los suyos, también en su sala del barrio):

- **su pelea**, la consulta (`bossFisico`): en mi frigio, un golpe seco en cada corchea (el pulso que cuenta con dos
  dedos), el latido del paciente, su campanilla de las órdenes (una, dos y tres veces, como las que da), un coro que
  recita en un solo tono, como una lección, las vocales de su aforismo (*Quae me-di-ca-men-ta non sa-nant, fer-rum
  sa-nat*) y las cuerdas en el semitono; **el hierro** (`bossFisico2`), cuando se rehace de sus dudas (en su sala,
  al quitarse la máscara): más deprisa, los tambores, los metales, las cuerdas en trémolo, el coro una octava más
  arriba y la campanilla siempre tres veces;
- **su muerte** (`fisicoMuerte`), al paso de la escena (un pulso por segundo; lo de después de la caída, un segundo
  más tarde, por la cámara lenta): el latido, cada vez más despacio, y las cuerdas en su semitono; al mirar la luna,
  el salterio sube nota a nota (lo que sube a la luz); con «Todo se mueve hacia ella», el coro se abre a mayor; una
  voz sola sube con lo que te dice y se corta a media frase; el latido se embala y se para; un silencio; y, mientras
  la cámara sube a la luna, el acorde abierto (mayor, con la novena) que no cierra, y una campanilla pequeña, lejos.
  Después, sin la fanfarria de los jefes vencidos: se apaga sola.

Se oyen sin jugar con `node tools/temas.mjs bossFisico:40,bossFisico2:30,fisicoMuerte:33` (los graba a .wav y .mp3
en `tools/scratch/temas`).

Se puede saltar (la tecla de interactuar). Su cuerpo se queda allí, en la luz, para siempre (`rama:fisico`; y
`boss:fisico`, como cualquier jefe vencido; no en su mesa del barrio, que sigue vacía con su nota): *«Mestre Clemente,
de espaldas en la isla, en la luz, con los brazos abiertos. Tiene los ojos abiertos, a la luna, y la boca llena de
sangre, a medio decir algo.»*

## 9. Lo que queda

- **El cuerpo**, boca abajo en la alberca, con la mancha de sangre en el agua, meciéndose apenas con lo que trae la
  cascada. Se le puede registrar: del cordón del cuello, **la llave de la reja** de la galería de la Sé (la que no
  quería darte: ahora no hace falta pedírsela) — y, si nunca le hablaste, la flor blanca.
- **Su botica**, en el Vergel, sigue ahí: al leer **su cuaderno de los remedios**, su mesa es tuya (los cocimientos,
  `desf:cocimientos`), aunque ya no te dé el primero.
- **El final**: no sube a ver el sol. En la hoja del final: *«Bajo la plaza del Pan, en la cisterna, el agua seguía
  meciendo a un hombre boca abajo. En la isla, en la luz, otro miraba la luna con los ojos abiertos. Entre los dos, lo
  verde siguió creciendo.»*

Banderas: `fisico:escapado`, `rama:cisterna`, `desf:muerto`, `desf:llave`, `rama:fisico`, `rama:bruma` y
`boss:fisico` (y las de siempre).

## 10. Cómo se prueba

`tools/fisicorama.mjs` (levanta su propio Vite si no hay uno en el 5199):

```
node tools/fisicorama.mjs                       # todo
node tools/fisicorama.mjs escena fotos          # la escena, con capturas en tools/shots/rama_*.png
```

- `huida`: por el otro camino sin tocarle (se le escapa: su nota, él se va, el Desfigurado al pretil);
- `herido`: lo mismo, habiéndole herido en la calle (no se le escapa);
- `escena`: la cisterna (la llegada, hablarle, bajar) y la escena entera, paso a paso;
- `pelea`: las órdenes de la campanilla (40 s, invulnerable y quieto), el muro de la escalera; cuando de ellos queda
  uno, baja él; el duelo (45 s: sus golpes con la hoja, el remate, sus órdenes, sus dudas);
- `muerte`: vencerle; su muerte, paso a paso (con fotos); su cuerpo; al cargar, sigue en la luz;
- `tema`: su música (la de su pelea, arriba y abajo; la del hierro al rehacerse, y en el barrio al quitarse la
  máscara);
- `cae`: caer en la pelea y volver (baja enseguida);
- `cuerpo`: la llave del cuerpo y el cuaderno.

## 11. Lo que tiene que decidir el autor

1. **La dureza del duelo**: él con los suyos, con su cabeza entrenada y el remate cuando te sujetan, puede ser mucho;
   está medido con pruebas, no jugado a mano. Y la música (hoy, la de los jefes que le tocaba).
2. **Si ya conocías al Desfigurado** cuando se te escapó, hoy no pasa nada más que su nota. ¿Debería buscarle igual
   (en su botica, en el Vergel)?
3. **¿Se puede salvar al Desfigurado?** Hoy no: la escena empieza al bajar. Podría haber un modo (avisarle, subir a
   tiempo al pretil, la flor de lo hondo…).
4. **Lo que entiende el Físico, ¿lo encuentra alguien?** Hoy no lo dice entero, a propósito. Podría quedar algo (su
   historia clínica de ti, con una última línea a medias) o nada, como ahora.
