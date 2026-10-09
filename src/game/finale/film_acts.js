// Los actos de la película, por punto de control: cada uno sigue con los
// siguientes hasta el final (ver director.js).
import { actRise, actGrab } from './film_rise.js';

export const ACTS = {
  *rito(D, o) {
    yield* actRise(D, o);
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
