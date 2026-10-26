# El monolito lleno de almas

La segunda forma del ídolo de la fuente (octubre de 2026): una piedra de pie que
nadie labró, tosca y vencida hacia el que se arrodilla, con la cima rota y hueca,
llena de almas que empujan la piedra desde dentro y piden auxilio (caras y manos
de todos los tamaños que gritan de una en una), una grieta encendida, espinazo y
costillas por detrás, brazos que salen del hueco de arriba, las tallas de los
castros, los zunchos de Martín y el ojo en la cara de delante, con sus párpados de
piedra.

Se cambió por la estatua (la de ahora, en `src/entities/idol_statue*.js`): su
forma y su color recordaban demasiado a otra cosa, y en medio de la cisterna
estorbaba la pelea con el arzobispo. Aquí queda el código entero:

- `idol_monolith_geo.js`: la geometría y las almas (se calcula en un hilo de
  fondo: `idol_worker.js`).
- `idol_monolith.js`: el montaje y lo que se mueve (el sombreador de las almas,
  los párpados, el ojo que mira, los gritos).

Las láminas de `arte/bocetos/` (las del monolito) se dibujan todavía con él:
`tools/bocetos/mono3d.js` lo monta desde aquí.
