// Los actos de la película, por punto de control: cada uno sigue con los
// siguientes hasta el final (ver director.js).
import { actRise } from './film_rise.js';
import { actNave } from './film_nave.js';
import { actGrab } from './film_grab.js';

export const ACTS = {
  *rito(D, o) {
    yield* actRise(D, o);
    yield* actNave(D, o);
    yield* actGrab(D, o);
    yield* ACTS.establo(D, {});
  },
  // (modo de pruebas: desde la salida del cráter, sin la cisterna)
  *nave(D, o) {
    D.rise = null;
    yield* actNave(D, o);
    yield* actGrab(D, o);
    yield* ACTS.establo(D, {});
  },
  // (modo de pruebas: desde que te atrapa)
  *grab(D, o) {
    D.caught = null;
    yield* actGrab(D, o);
    yield* ACTS.establo(D, {});
  },
  *establo(D, o) {
    D.setCP('establo');
    void o;
  },
  *torreSur(D, o) {
    D.setCP('torreSur');
    void o;
  },
  *muralla(D, o) {
    D.setCP('muralla');
    void o;
  },
};
