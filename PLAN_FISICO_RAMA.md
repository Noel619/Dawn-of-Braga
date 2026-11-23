# El paciente que se le escapó

Hecho el 22 de noviembre de 2026. Lo que pidió el autor:

> El Físico va a ser un enemigo con potencial de cambiar partes de la historia. Por ejemplo, si logras evadir por
> completo su zona sin luchar o pelear contra él, volverá a aparecer cuando conozcas al tipo de las cloacas […] para
> asesinarlo por la espalda, en una escena que debería ser una referencia al final de Scarface. Para ese punto de la
> partida, sus conocimientos sobre todo esto son mucho más avanzados, e incluso ha empezado con la modificación de su
> propio cuerpo. Además de que también tiene a sus secuaces más entrenados, les da órdenes con la campana […]. Al
> mismo tiempo que aparece la cinemática en la que éste lo asesina, y el hombre raro cae por la cascada, detrás del
> doctor una bruma negra se expande. Y vienen monstruosidades.

«El tipo de las cloacas» es **el Desfigurado** (la cloaca bajo la plaza del Pan, la sala de la luz). Lo que sigue
cuenta cómo está hecho, cómo se prueba y lo que queda por decidir (§6).

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

De la corona le sale la bruma negra en hilachas. Allí arriba es intocable: ni se le fija ni se le hiere (`data.air`,
como lo que va por el techo).

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
| 10,4 | Cae por la cascada, **a cámara lenta**, a la alberca | Desde la sala, siguiéndole |
| 13,6 | Boca abajo, en cruz, en el agua, que se tiñe; arriba, el Físico se asoma al pretil a mirarle | Desde arriba (a ras del agua no se ve: la capa, oscura, de canto); luego la cámara se aparta y sube hasta él |
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

**La pelea**: dos tandas de tres (la segunda, cuando de la primera queda uno), con él en lo alto, tocando y hablando
(*«Despacio. Que no se escape otra vez.»*, *«No le hagáis daño de más: es mío.»*…). Al vencerles: *«Esto no era la
consulta. La consulta es abajo, donde va el agua. Allí te espero.»* Se va por la galería, con su bruma (y la luz se
apaga con ella): *«La bruma negra se retira por la galería, detrás de él. En la alberca, el Desfigurado sigue boca
abajo.»* (`rama:bruma`).

**Si caes**, la pelea vuelve a empezar al volver a bajar a la sala, sin la escena: él ya en el pretil (*«Otra vez tú.
Lo tengo apuntado.»*), la bruma, la campanilla y los suyos.

## 6. Lo que queda

- **El cuerpo**, boca abajo en la alberca, con la mancha de sangre en el agua, meciéndose apenas con lo que trae la
  cascada. Se le puede registrar: del cordón del cuello, **la llave de la reja** de la galería de la Sé (la que no
  quería darte: ahora no hace falta pedírsela) — y, si nunca le hablaste, la flor blanca.
- **Su botica**, en el Vergel, sigue ahí: al leer **su cuaderno de los remedios**, su mesa es tuya (los cocimientos,
  `desf:cocimientos`), aunque ya no te dé el primero.
- **El final**: no sube a ver el sol. En la hoja del final: *«Bajo la plaza del Pan, en la alberca de la cisterna, el
  agua seguía meciendo a un hombre boca abajo. En la isla, lo verde siguió creciendo, sin nadie que lo mirase.»*

Banderas: `fisico:escapado`, `rama:cisterna`, `desf:muerto`, `desf:llave`, `rama:bruma` (y las de siempre).

## 7. Cómo se prueba

`tools/fisicorama.mjs` (levanta su propio Vite si no hay uno en el 5199):

```
node tools/fisicorama.mjs                       # todo
node tools/fisicorama.mjs escena fotos          # la escena, con capturas en tools/shots/rama_*.png
```

- `huida`: por el otro camino sin tocarle (se le escapa: su nota, él se va, el Desfigurado al pretil);
- `herido`: lo mismo, habiéndole herido en la calle (no se le escapa);
- `escena`: la cisterna (la llegada, hablarle, bajar) y la escena entera, paso a paso;
- `pelea`: las órdenes de la campanilla (40 s, invulnerable y quieto), el muro de la escalera, vencerles;
- `cae`: caer en la pelea y volver;
- `cuerpo`: la llave del cuerpo y el cuaderno.

## 8. Lo que tiene que decidir el autor

1. **El duelo con el Físico cambiado.** Se va diciendo que te espera «abajo, donde va el agua». No está hecho:
   ¿dónde (las cloacas hondas, el Sumidero, lo hondo)?, ¿cómo pelea cambiado (la hoja de amputar, la corona, la
   bruma, sus órdenes)?, ¿aprende de lo que hiciste contra los suyos?
2. **Si ya conocías al Desfigurado** cuando se te escapó, hoy no pasa nada más que su nota. ¿Debería buscarle igual
   (en su botica, en el Vergel)?
3. **¿Se puede salvar al Desfigurado?** Hoy no: la escena empieza al bajar. Podría haber un modo (avisarle, subir a
   tiempo al pretil, la flor de lo hondo…).
4. **La dureza** de los de la bruma y la música de la pelea (hoy, la de su caza).
