// La cabeza del Físico en la pelea de su sala: qué hace en cada momento.
//
// Los golpes no se aprenden (están hechos a mano, con sus tiempos:
// entities/fisico.js). Se aprende la táctica: cada poco (de 0,3 a 0,45 s, o
// en cuanto acaba un golpe) elige entre lo que haría alguien que pelea con
// una vara de dos metros, una esponja de beleño y, después, los hierros y
// el fuego: guardar su distancia, acercarse, apartarse un paso, rodearte por
// un lado o por el otro, esperar a que te descubras, cada uno de sus golpes
// (los que tenga a mano en ese tiempo de la pelea) o amagar.
//
// Lo elige una red pequeña (unos dos mil números) entrenada fuera del juego
// (tools/entrena_fisico.mjs) contra jugadores de prueba de muchas maneras en
// una copia simplificada de la pelea (tools/fisico_sim.mjs); los pesos, en
// fisico_red.json. Sin la red, una manera hecha a mano (manual), parecida a
// la de antes.
//
// Con reflejos de persona: decide sobre lo que vio hace un cuarto de segundo
// (nunca lee el mando) y lo que decide lo sostiene (un paso a un lado dura lo
// que dura; no cambia de idea a cada fotograma). Lo que sabe de ti de otras
// veces (la historia clínica: fisico_historia.js) también lo ve.
//
// Es puro cálculo, sin el motor: lo usan igual el juego (game/fisico_pelea.js)
// y el simulador.

export const OPCIONES = ['acecha', 'acerca', 'aparta', 'rodeaI', 'rodeaD', 'espera', 'barrido', 'pica', 'gancho', 'esponja', 'sahumerio', 'sierra', 'lanceta', 'trepano', 'cauterio', 'cauterioPica', 'cal', 'amago'];
export const OP = Object.fromEntries(OPCIONES.map((k, i) => [k, i]));
export const N_MOV = 6;
export const N_OUT = OPCIONES.length;
// los golpes de cada opción (FI_ATTACKS) y el que amaga en cada tiempo
export const GOLPE_DE = { barrido: 'barrido', pica: 'pica', gancho: 'gancho', esponja: 'esponja', sahumerio: 'sahumerio', sierra: 'sierra', lanceta: 'lanceta', trepano: 'trepano', cauterio: 'cauterio', cauterioPica: 'cauterioPica', cal: 'cal' };
export const AMAGA = [null, 'pica', 'lanceta', 'cauterioPica'];
// la distancia que guarda en cada tiempo (la vara; los hierros, de cerca; el
// cauterio)
export const DIST = [0, 2.9, 1.8, 2.4];
// lo que tarda en ver (s) y lo que sostiene un movimiento antes de cambiar a
// otro (s); cada cuánto se lo piensa (s); lo que espera entre amagos (s)
export const REACCION = 0.25;
export const SOSTIENE = 0.6;
export const CADA = [0.3, 0.45];
export const ENTRE_AMAGOS = 5;
// lo que retiene un golpe (el reloj del amago y del golpe retenido): hasta
// qué parte del camino al impacto, y a qué paso
export const RETIENE = { hasta: 0.8, paso: 0.6 };
export const AMAGO_EN = 0.6;

// Su aliento: nadie golpea sin parar. Cada golpe cuesta (el amago, poco); se
// recupera respirando (golpeando, menos); sin el que pide un golpe, no lo da.
export const ALIENTO = {
  max: 100,
  recupera: 10,
  enGolpe: 0.4,
  coste: { barrido: 22, pica: 16, gancho: 18, esponja: 20, sahumerio: 10, sierra: 30, lanceta: 14, trepano: 22, cauterio: 22, cauterioPica: 16, cal: 10, campanilla: 0, amago: 8 },
};
// (lo que respira en dt: golpeando o no)
export const respira = (a, dt, golpeando) => Math.min(ALIENTO.max, a + dt * ALIENTO.recupera * (golpeando ? ALIENTO.enGolpe : 1));

// estados del jugador (lo que se le ve hacer)
export const PE = { libre: 0, ataca: 1, rueda: 2, bebe: 3, cubre: 4, herido: 5, cogido: 6 };
export const N_IN = 46;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Lo que ve, en números (la entrada de la red). o: lo que ve de ti (hace un
// cuarto de segundo); yo: lo que sabe de sí mismo (ahora); H: lo que tiene
// apuntado de ti (Historia.rasgos()); m: la cabeza (lo que estaba haciendo).
export function rasgos(o, yo, H, m, x = new Float32Array(N_IN)) {
  x.fill(0);
  x[0] = clamp(o.d / 6, 0, 2);
  x[1] = Math.sin(o.rel);
  x[2] = Math.cos(o.rel);
  x[3] = clamp(o.vr / 5, -1.5, 1.5);
  x[4] = clamp(o.vl / 5, -1.5, 1.5);
  x[5 + clamp(o.pe | 0, 0, 6)] = 1;
  x[12] = clamp(o.pk, 0, 1);
  x[13] = clamp(o.php, 0, 1);
  x[14] = clamp(o.pst, 0, 1);
  x[15] = clamp(o.pfr, 0, 1);
  x[16] = clamp(yo.hp, 0, 1);
  x[16 + clamp(yo.fase | 0, 1, 3)] = 1;
  x[20] = clamp(yo.cd / 1.5, 0, 1);
  x[21] = clamp(yo.desde / 3, 0, 1);
  x[22] = clamp(yo.paredYo / 4, 0, 1);
  x[23] = clamp(o.paredEl / 4, 0, 1);
  x[24] = o.nube ? 1 : 0;
  x[25] = clamp(yo.coronados / 2, 0, 1);
  x[26] = clamp(yo.fuegos / 4, 0, 1);
  for (let i = 0; i < 5; i++) x[27 + i] = yo.listo[i] ? 1 : 0;
  const s = H ? H.seguro : 0;
  if (H) {
    x[32] = H.lado * s;
    x[33] = H.atras * s;
    x[34] = H.pronto * s;
    x[35] = H.desvia * s;
    x[36] = H.cubre * s;
    x[37] = H.bebe * s;
    x[38] = H.huye * s;
    x[39] = H.ataca * s;
    x[40] = H.racha * s;
    x[41] = s;
  }
  x[42] = m && m.op < N_MOV ? 1 : 0;
  x[43] = m ? clamp(m.edad / 2, 0, 1) : 0;
  x[44] = 1;
  x[45] = clamp((yo.aliento ?? ALIENTO.max) / ALIENTO.max, 0, 1);
  return x;
}

// ------------------------------------------------------------ la red
// Una capa escondida (tanh) y la salida: una puntuación por opción.
export class Red {
  constructor(J) {
    J = Red.ajusta(J);
    this.ni = J.n_in;
    this.nh = J.n_h;
    this.no = J.n_out;
    this.w1 = Float32Array.from(J.w1);
    this.b1 = Float32Array.from(J.b1);
    this.w2 = Float32Array.from(J.w2);
    this.b2 = Float32Array.from(J.b2);
    this.h = new Float32Array(this.nh);
    this.out = new Float32Array(this.no);
    this.meta = J.meta || null;
  }
  // (de un vector plano de parámetros: el entrenamiento)
  static plana(p, ni = N_IN, nh = 32, no = N_OUT) {
    let k = 0;
    const take = (n) => p.subarray(k, (k += n));
    const r = Object.create(Red.prototype);
    r.ni = ni;
    r.nh = nh;
    r.no = no;
    r.w1 = take(ni * nh);
    r.b1 = take(nh);
    r.w2 = take(nh * no);
    r.b2 = take(no);
    r.h = new Float32Array(nh);
    r.out = new Float32Array(no);
    return r;
  }
  // (una red de antes, que veía menos cosas: lo nuevo, con peso cero; hace lo
  // mismo que hacía)
  static ajusta(J, ni = N_IN) {
    if (!J || !J.w1 || J.n_in >= ni) return J;
    const w1 = [];
    for (let j = 0; j < J.n_h; j++) for (let i = 0; i < ni; i++) w1.push(i < J.n_in ? J.w1[j * J.n_in + i] : 0);
    return { ...J, n_in: ni, w1 };
  }
  static tam(ni = N_IN, nh = 32, no = N_OUT) {
    return ni * nh + nh + nh * no + no;
  }
  forward(x) {
    const { ni, nh, no, w1, b1, w2, b2, h, out } = this;
    for (let j = 0; j < nh; j++) {
      let s = b1[j];
      const o = j * ni;
      for (let i = 0; i < ni; i++) s += w1[o + i] * x[i];
      h[j] = Math.tanh(s);
    }
    for (let k = 0; k < no; k++) {
      let s = b2[k];
      const o = k * nh;
      for (let j = 0; j < nh; j++) s += w2[o + j] * h[j];
      out[k] = s;
    }
    return out;
  }
  toJSON(meta) {
    const r = (a) => Array.from(a, (v) => Math.round(v * 1e4) / 1e4);
    return { n_in: this.ni, n_h: this.nh, n_out: this.no, w1: r(this.w1), b1: r(this.b1), w2: r(this.w2), b2: r(this.b2), meta: meta || this.meta || null };
  }
}

// ------------------------------------------------------------ la cabeza
// Pesos de cada golpe en la manera hecha a mano (los de entities/fisico.js).
const PESO = { barrido: 3, pica: 2.4, gancho: 2.2, esponja: 2, sahumerio: 1.6, sierra: 3, lanceta: 2.2, trepano: 1.8, cauterio: 3, cauterioPica: 2.2, cal: 0.9 };

export class Mente {
  // red: una Red (o null: la manera hecha a mano); op: { reaccion, temp, rng }
  constructor(red, op = {}) {
    this.red = red;
    this.reaccion = op.reaccion ?? REACCION;
    // (la temperatura: cuánto se deja llevar por lo segundo mejor; con la red,
    // 1 es como se entrenó)
    this.temp = op.temp ?? 1;
    this.rng = op.rng || Math.random;
    this.x = new Float32Array(N_IN);
    this.p = new Float64Array(N_OUT);
    this.reset();
  }
  reset() {
    this.buf = [];
    this.op = 0;
    this.opT = -9;
    this.sigT = 0;
    this.amagoT = -99;
    this.lado = this.rng() < 0.5 ? -1 : 1;
    this.n = 0;
  }
  get edad() {
    return this.t - this.opT;
  }
  // Lo que ve (cada fotograma): se guarda un rato, para verlo con retraso.
  ve(t, o) {
    this.t = t;
    const B = this.buf;
    B.push(o);
    while (B.length > 2 && B[1].t <= t - 1.2) B.shift();
  }
  // lo que vio hace un cuarto de segundo (más o menos)
  visto(t) {
    const B = this.buf;
    if (!B.length) return null;
    const tv = t - this.reaccion * (0.85 + this.rng() * 0.3);
    let o = B[0];
    for (let i = B.length - 1; i >= 0; i--)
      if (B[i].t <= tv) {
        o = B[i];
        break;
      }
    return o;
  }
  // ¿Toca pensar?
  toca(t) {
    return t >= this.sigT;
  }
  // Pensar ya (al acabar un golpe, al amagar): en un momento.
  pronto(t, s = 0.1) {
    this.sigT = Math.min(this.sigT, t + s);
  }
  // Decide (yo: lo que sabe de sí; H: Historia.rasgos(); mascara(o, m): las
  // opciones que se pueden, sobre lo que ha visto). Devuelve el índice de la
  // opción (o -1 si no ha visto nada aún).
  decide(t, yo, H, mascara) {
    this.t = t;
    const o = this.visto(t);
    if (!o) return -1;
    const m = mascara(o, this);
    // (lo que ha decidido de un movimiento lo sostiene un poco; tras amagar,
    // un golpe)
    const sost = this.op < N_MOV && t - this.opT < SOSTIENE;
    const trasAmago = t - this.amagoT < 0.3;
    let alguno = false;
    for (let i = 0; i < N_OUT; i++) {
      if (i < N_MOV && ((sost && i !== this.op) || trasAmago)) m[i] = 0;
      if (m[i]) alguno = true;
    }
    if (!alguno) for (let i = 0; i < N_MOV; i++) m[i] = 1;
    let op;
    if (this.red) {
      const x = rasgos(o, yo, H, this, this.x);
      const z = this.red.forward(x);
      op = this.muestra(z, m);
    } else op = this.manual(o, yo, m);
    if (op !== this.op || op >= N_MOV) this.opT = t;
    if (op === OP.amago) this.amagoT = t;
    this.op = op;
    this.n++;
    this.sigT = t + CADA[0] + this.rng() * (CADA[1] - CADA[0]);
    this.o = o;
    return op;
  }
  muestra(z, m) {
    const p = this.p;
    let mx = -1e9;
    for (let i = 0; i < N_OUT; i++) if (m[i] && z[i] > mx) mx = z[i];
    let s = 0;
    for (let i = 0; i < N_OUT; i++) {
      p[i] = m[i] ? Math.exp((z[i] - mx) / this.temp) : 0;
      s += p[i];
    }
    let r = this.rng() * s;
    for (let i = 0; i < N_OUT; i++) {
      if (!m[i]) continue;
      r -= p[i];
      if (r <= 0) return i;
    }
    for (let i = N_OUT - 1; i >= 0; i--) if (m[i]) return i;
    return 0;
  }
  // La manera hecha a mano (la de antes, con su distancia): si puede golpear,
  // casi siempre golpea (a suertes, con los pesos de cada golpe); si no,
  // guarda su distancia y te rodea.
  manual(o, yo, m) {
    let tot = 0;
    for (let i = N_MOV; i < N_OUT; i++) if (m[i] && i !== OP.amago) tot += PESO[OPCIONES[i]] || 1;
    if (tot > 0 && this.rng() < 0.85) {
      let r = this.rng() * tot;
      for (let i = N_MOV; i < N_OUT; i++) {
        if (!m[i] || i === OP.amago) continue;
        r -= PESO[OPCIONES[i]] || 1;
        if (r <= 0) return i;
      }
    }
    const D = DIST[yo.fase] || 2.5;
    if (o.d > D + 0.9 && m[OP.acerca]) return OP.acerca;
    if (o.d < D - 0.9 && m[OP.aparta]) return OP.aparta;
    if (this.rng() < 0.05) this.lado = -this.lado;
    const r = this.lado > 0 ? OP.rodeaI : OP.rodeaD;
    return m[r] ? r : m[OP.acecha] ? OP.acecha : 0;
  }
}

// ------------------------------------------------------------ el movimiento
// Lo que hace cada opción de moverse: hacia dónde (un punto al que ir) y a qué
// paso, desde (ex, ez) con el jugador en (px, pz). walk/run: sus pasos; D:
// la distancia que guarda. Devuelve [x, z, velocidad] (o null: quieto).
export function rumbo(op, ex, ez, px, pz, D, walk, run, lado = 1) {
  const dx = px - ex,
    dz = pz - ez;
  const d = Math.hypot(dx, dz) || 1;
  const ux = dx / d,
    uz = dz / d;
  // (su izquierda, mirándote: el giro de 'adelante' hacia +x mirando a +z)
  const lx = uz,
    lz = -ux;
  switch (op) {
    case OP.acecha: {
      // corrige la distancia y se deja ir un poco de lado
      const e = clamp((d - D) * 1.4, -1, 1);
      return [ex + ux * e + lx * 0.35 * lado, ez + uz * e + lz * 0.35 * lado, Math.max(0.35, Math.abs(e)) * walk];
    }
    case OP.acerca:
      return [px, pz, d > 4.5 ? run : walk];
    case OP.aparta:
      return [ex - ux * 1.5, ez - uz * 1.5, walk * 1.15];
    case OP.rodeaI:
    case OP.rodeaD: {
      const s = op === OP.rodeaI ? 1 : -1;
      const e = clamp((d - D) * 0.8, -0.6, 0.6);
      return [ex + lx * s + ux * e, ez + lz * s + uz * e, walk * 0.9];
    }
    default:
      return null;
  }
}
