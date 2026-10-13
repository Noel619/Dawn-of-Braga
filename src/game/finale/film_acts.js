// Los actos de la película, por punto de control: cada uno sigue con los
// siguientes hasta el final (ver director.js).
import { actRise } from './film_rise.js';
import { actNave } from './film_nave.js';
import { actGrab } from './film_grab.js';
import { actHerreria } from './film_city.js';
import { actTorre } from './film_tower.js';
import { actRide } from './film_ride.js';
import { actEnd } from './film_end.js';

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
  // (desde el punto de control: o.retry, o.resume u o.debug; si no, se
  // viene de la paja, del acto 2)
  *establo(D, o) {
    D.setCP('establo');
    yield* actHerreria(D, { fromCP: !!(o.retry || o.resume || o.debug) });
    if (D.g.player.dead) return;
    yield* ACTS.torreSur(D, {});
  },
  *torreSur(D, o) {
    D.setCP('torreSur');
    yield* actTorre(D, { fromCP: !!(o.retry || o.resume || o.debug) });
    if (D.g.player.dead) return;
    yield* actRide(D, {});
    if (D.g.player.dead) return;
    yield* ACTS.muralla(D, {});
  },
  // (modo de pruebas: la cabalgada, desde la torre rota)
  *cabalgada(D, o) {
    D.gow1 = null;
    yield* actRide(D, { ...o, fromCP: true });
    yield* ACTS.muralla(D, {});
  },
  *muralla(D, o) {
    D.setCP('muralla');
    yield* actEnd(D, { fromCP: !!(o.retry || o.resume || o.debug) });
  },
};
