// La historia clínica: lo que el Físico apunta de ti, en la calle y en su
// sala, y lo que hace con ello. Se guarda en la partida (flags
// 'fisico:historia') y crece en la hoja de su mesa (story.js:
// NOTES.historia).
//
// No sabe lo que vas a hacer (no lee el mando): lleva la cuenta de lo que has
// hecho cuando le has tenido delante. Hacia dónde ruedas cuando ves venir un
// golpe suyo; si te adelantas (ruedas o pones el hierro antes de tiempo: un
// amago te engaña, un golpe retenido te coge al salir de la voltereta); si
// desvías o te cubres; cuándo bebes y si lo haces con él encima; si huyes
// herido; si subes a los tejados o te metes en las casas; cómo golpeas (de
// cuántos en cuántos); y qué golpes suyos te entran.
//
// Lo viejo pesa menos: a cada encuentro nuevo, lo apuntado se queda en un
// 70 %. Es puro cálculo (sin el motor): lo usa también el simulador con que se
// entrenan sus tácticas (tools/fisico_sim.mjs).

const OLVIDO = 0.7;
// (lo que cuenta como reaccionar a un golpe: desde que lo empieza hasta poco
// después de que pase)
const TRAS = 0.2;

const vacia = () => ({
  v: 1,
  // encuentros: en la calle y en su sala; caídas (tuyas) y veces dormido
  caza: 0,
  peleas: 0,
  muertes: 0,
  dormido: 0,
  suelta: 0,
  // las voltereta que da cuando le ve venir: a su izquierda (l), a su
  // derecha (r), atrás (b), hacia él (f); y a tiempo o no
  rueda: { l: 0, r: 0, b: 0, f: 0 },
  tiempo: { pronto: 0, justo: 0, tarde: 0 },
  // desvía (intentos, logrados, antes de tiempo), se cubre, le rompen la
  // guardia
  desvia: { n: 0, ok: 0, pronto: 0 },
  cubre: { n: 0, rotos: 0 },
  // sus golpes vistos (para las proporciones)
  vistos: 0,
  // bebe: cuántas, con cuánta vida, con él cerca (a menos de 5 m; encima, a
  // menos de 3)
  bebe: { n: 0, hp: 0, cerca: 0, encima: 0 },
  // huye herido
  huye: 0,
  // golpea: cuántos golpes, fuertes, rachas (y su largo) y el tiempo de
  // pelea en que se han contado
  golpes: { n: 0, fuertes: 0, rachas: 0, largo: 0, t: 0 },
  // en la calle: a los tejados, a las casas, en los cepos
  tejados: 0,
  casas: 0,
  cepos: 0,
  // lo que le entra de lo suyo: por golpe, {n, entra}
  entra: {},
});

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
function norm(d) {
  const V = vacia();
  if (!d || typeof d !== 'object') return V;
  const copia = (dst, src) => {
    for (const k in dst) {
      if (dst[k] && typeof dst[k] === 'object') copia(dst[k], src && src[k]);
      else dst[k] = num(src && src[k]);
    }
  };
  copia(V, d);
  V.v = 1;
  if (d.entra && typeof d.entra === 'object') for (const k in d.entra) V.entra[k] = { n: num(d.entra[k] && d.entra[k].n), entra: num(d.entra[k] && d.entra[k].entra) };
  return V;
}
// multiplica todos los contadores (el olvido)
function escala(o, k) {
  for (const key in o) {
    if (key === 'v' || key === 'caza' || key === 'peleas' || key === 'muertes' || key === 'dormido') continue;
    if (o[key] && typeof o[key] === 'object') escala(o[key], k);
    else if (typeof o[key] === 'number') o[key] *= k;
  }
}

export class Historia {
  constructor(datos) {
    this.d = norm(datos);
    // el golpe suyo en curso (para medir tus reacciones)
    this.golpe = null;
    // tu racha de golpes
    this.racha = 0;
    this.rachaT = -9;
    // la huida en curso
    this.lejos = 0;
    this.huyeT = -99;
    this.reaccionT = -9;
  }
  toJSON() {
    return this.d;
  }

  // ------------------------------------------------------------ lo que pasa
  // Un encuentro nuevo: en la calle ('caza') o en su sala ('pelea').
  encuentro(tipo) {
    escala(this.d, OLVIDO);
    if (tipo === 'pelea') this.d.peleas++;
    else this.d.caza++;
    this.golpe = null;
    this.racha = 0;
  }
  // Empieza un golpe (t: ahora; tGolpe: cuándo llega el primer impacto,
  // desde ahora; fin: lo que dura).
  // (amago: lo empieza y no lo da; lo que hagas cuenta, pero el golpe no)
  ataca(nombre, t, tGolpe, dur, amago = false) {
    this.cierra();
    this.golpe = { nombre, t0: t, hit: t + tGolpe, fin: t + dur, r: null, reac: false, amago, contado: amago };
    if (!amago) this.d.vistos++;
  }
  // Lo que ha pasado con el golpe: 'entra' (te ha dado), 'cubre' (lo has
  // parado), 'rompe' (te ha roto la guardia), 'desvia', 'esquiva' (lo has
  // pasado rodando). Lo que no llega a nada, al acabar: 'aire'.
  resultado(nombre, r) {
    const G = this.golpe;
    const mio = G && G.nombre === nombre && !G.amago;
    const E = (this.d.entra[nombre] = this.d.entra[nombre] || { n: 0, entra: 0 });
    const da = r === 'entra' || r === 'rompe';
    if (r === 'rompe') this.d.cubre.rotos++;
    // (un golpe de varios tajos, la sierra: cuenta una vez, y entra si
    // entra alguno)
    if (mio && G.contado) {
      if (da && !G.entro) {
        G.entro = true;
        E.entra++;
      }
      return;
    }
    E.n++;
    if (da) E.entra++;
    if (mio) {
      G.contado = true;
      G.entro = da;
      G.r = r;
    }
  }
  // (acaba el golpe en curso: si no ha llegado a nada, al aire)
  cierra() {
    const G = this.golpe;
    if (G && !G.contado) {
      const E = (this.d.entra[G.nombre] = this.d.entra[G.nombre] || { n: 0, entra: 0 });
      E.n++;
      G.contado = true;
    }
    this.golpe = null;
  }

  // Lo que haces tú: kind, como game.onPlayerAction ('attack', 'roll',
  // 'parryTry', 'parry', 'block', 'heal'); c: { t, px, pz, ex, ez, hpK, d }
  // (dónde estás tú y dónde él, tu vida, la distancia).
  accion(kind, info, c) {
    const D = this.d;
    const G = this.golpe;
    const enGolpe = G && c.t >= G.t0 && c.t <= G.hit + TRAS + 0.25 && c.t - this.reaccionT > 0.3;
    if (kind === 'roll') {
      if (!enGolpe) return;
      this.reaccionT = c.t;
      G.reac = true;
      // hacia dónde, mirándole: a tu izquierda (l), derecha (r), atrás, hacia él
      let ux = c.ex - c.px,
        uz = c.ez - c.pz;
      const m = Math.hypot(ux, uz) || 1;
      ux /= m;
      uz /= m;
      const along = info.x * ux + info.z * uz;
      // (tu izquierda, mirándole: el giro de 'adelante' hacia +x cuando miras
      // a +z)
      const lat = info.x * uz - info.z * ux;
      const dir = info.back || along < -0.6 ? 'b' : along > 0.6 ? 'f' : lat > 0 ? 'l' : 'r';
      D.rueda[dir]++;
      const ad = G.hit - c.t;
      D.tiempo[ad > 0.45 ? 'pronto' : ad < -0.1 ? 'tarde' : 'justo']++;
    } else if (kind === 'parryTry') {
      if (!enGolpe) return;
      this.reaccionT = c.t;
      G.reac = true;
      D.desvia.n++;
      const ad = G.hit - c.t;
      if (ad > 0.25) {
        D.desvia.pronto++;
        D.tiempo.pronto++;
      } else D.tiempo[ad < -0.1 ? 'tarde' : 'justo']++;
    } else if (kind === 'parry') {
      D.desvia.ok++;
    } else if (kind === 'block') {
      if (!enGolpe) return;
      this.reaccionT = c.t;
      G.reac = true;
      D.cubre.n++;
    } else if (kind === 'heal') {
      D.bebe.n++;
      D.bebe.hp += c.hpK;
      if (c.d < 5) D.bebe.cerca++;
      if (c.d < 3) D.bebe.encima++;
    } else if (kind === 'attack') {
      D.golpes.n++;
      if (info && info.heavy) D.golpes.fuertes++;
      if (c.t - this.rachaT < 1.1) this.racha++;
      else {
        this.cierraRacha();
        this.racha = 1;
      }
      this.rachaT = c.t;
    }
  }
  cierraRacha() {
    if (this.racha > 0) {
      this.d.golpes.rachas++;
      this.d.golpes.largo += this.racha;
    }
    this.racha = 0;
  }
  // Cada poco, en la pelea (o persiguiéndote): la distancia, cómo se mueve
  // la distancia (vr: lo que te alejas, m/s) y tu vida. Si estás herido y te
  // alejas a la carrera un buen rato, huyes.
  muestra(dt, d, vr, hpK) {
    this.d.golpes.t += dt;
    if (hpK < 0.45 && vr > 2.2 && d > 3) this.lejos += dt;
    else this.lejos = Math.max(0, this.lejos - dt * 0.5);
    if (this.lejos > 1.4) {
      this.lejos = 0;
      if (this.d.golpes.t - this.huyeT > 6) {
        this.huyeT = this.d.golpes.t;
        this.d.huye++;
      }
    }
  }
  // En la calle: 'tejado', 'casa', 'cepo'; y lo que pasa en cualquier sitio:
  // 'dormido' (la esponja), 'suelta' (te sueltas), 'muere' (caes tú).
  evento(k) {
    const D = this.d;
    if (k === 'tejado') D.tejados++;
    else if (k === 'casa') D.casas++;
    else if (k === 'cepo') D.cepos++;
    else if (k === 'dormido') D.dormido++;
    else if (k === 'suelta') D.suelta++;
    else if (k === 'muere') D.muertes++;
  }

  // ------------------------------------------------------------ lo que sabe
  // Lo que sabe de ti, en números (lo que ve su cabeza: fisico_mente.js):
  // lado (-1, siempre a tu derecha; 1, siempre a tu izquierda), atras,
  // pronto, desvia, cubre, bebe (con él cerca), huye, ataca (lo que golpeas
  // por minuto, de 0 a 1), racha (de 0 a 1: de tres en tres) y la seguridad
  // de todo (cuánto ha visto, de 0 a 1).
  rasgos() {
    const D = this.d;
    const R = D.rueda;
    const lados = R.l + R.r;
    const todas = lados + R.b + R.f;
    const reac = D.tiempo.pronto + D.tiempo.justo + D.tiempo.tarde;
    const min = D.golpes.t / 60;
    return {
      lado: (R.l - R.r) / (lados + 2),
      atras: R.b / (todas + 2),
      pronto: D.tiempo.pronto / (reac + 3),
      desvia: D.desvia.n / (D.vistos + 4),
      cubre: D.cubre.n / (D.vistos + 4),
      bebe: D.bebe.cerca / (D.bebe.n + 1.5),
      huye: D.huye / (D.huye + 2),
      ataca: Math.min(1, D.golpes.n / (min + 0.5) / 30),
      racha: D.golpes.rachas > 0 ? Math.min(1, D.golpes.largo / D.golpes.rachas / 3) : 0,
      seguro: Math.min(1, (D.vistos + D.golpes.n * 0.3) / 25),
    };
  }
  // Hacia dónde rodarás si te lanza un golpe: 'l', 'r' o nada (si no se
  // sabe), con lo seguro que está (0..1).
  ladoProbable() {
    const R = this.d.rueda;
    const n = R.l + R.r;
    if (n < 3) return null;
    const k = (R.l - R.r) / (n + 2);
    if (Math.abs(k) < 0.3) return null;
    return { lado: k > 0 ? 'l' : 'r', k: Math.min(1, Math.abs(k) * (n / (n + 3))) };
  }
  // Lo que te entra de lo suyo: (entra + 1) / (n + 2)
  leEntra(nombre) {
    const E = this.d.entra[nombre];
    return E ? (E.entra + 1) / (E.n + 2) : 0.5;
  }

  // ------------------------------------------------------------ lo que escribe
  // Lo apuntado, en su letra (lo que se añade a la hoja de su mesa).
  lineas() {
    const D = this.d;
    const r = this.rasgos();
    const L = [];
    const T = [];
    const R = D.rueda;
    const lp = this.ladoProbable();
    // (para escribirlo, más seguro: cinco volteretas o más, casi siempre al
    // mismo lado, y más a los lados que atrás)
    const lados = R.l + R.r;
    if (lp && lados >= 5 && Math.abs(R.l - R.r) / (lados + 2) >= 0.4 && lados >= R.b) {
      L.push(`Rueda hacia su ${lp.lado === 'l' ? 'izquierda' : 'derecha'} cuando ve venir el golpe.`);
      T.push(`Barrer hacia su ${lp.lado === 'l' ? 'izquierda' : 'derecha'}.`);
    }
    if (R.b >= 3 && r.atras > 0.45) L.push('No rueda: se echa atrás, y siempre lo mismo, un paso.');
    const reac = D.tiempo.pronto + D.tiempo.justo + D.tiempo.tarde;
    if (reac >= 5 && r.pronto > 0.35) {
      L.push('Se adelanta: rueda antes de que le llegue el golpe. El miedo le corre por delante.');
      T.push('Amagar. Retener el golpe hasta que salga de la voltereta.');
    }
    // (lo que hace a menudo: en una parte buena de sus golpes)
    const vistos = Math.max(1, D.vistos);
    if (D.desvia.n >= 4 && D.desvia.n / vistos > 0.15) {
      if (D.desvia.ok / D.desvia.n > 0.4) L.push('Desvía con el hierro. Tiene buen ojo.');
      else L.push('Pone el hierro a todo y a destiempo.');
      T.push('Lo que no se desvía: el gancho, la esponja.');
    }
    if (D.cubre.n >= 4 && D.cubre.n / vistos > 0.2) {
      L.push(D.cubre.rotos >= 2 ? 'Se cubre y se cubre, hasta que se le cae el brazo.' : 'Se cubre tras el escudo; no se fía de sus piernas.');
      T.push('Cansarle el brazo. El gancho pasa por encima del escudo.');
    }
    if (D.bebe.n >= 2) {
      const hp = D.bebe.hp / D.bebe.n;
      if (D.bebe.encima / D.bebe.n > 0.4) {
        L.push('Bebe aunque me tenga encima.');
        T.push('Cuando beba, la vara.');
      } else if (hp < 0.35) L.push('Bebe tarde, cuando ya sangra mucho.');
      else L.push('Bebe pronto, a la primera sangre.');
    }
    if (D.huye >= 1.5) {
      L.push('Cuando se ve herido, huye. Luego vuelve.');
      T.push('Al que huye, el gancho.');
    }
    // (golpes por minuto de pelea)
    const pm = D.golpes.t > 0 ? D.golpes.n / (D.golpes.t / 60) : 0;
    if (D.golpes.rachas >= 4 && r.racha > 0.8) {
      L.push('Golpea de tres en tres, y al tercero se queda abierto.');
      T.push('Dejarle acabar y entrar entonces.');
    } else if (D.golpes.t > 40 && pm > 38) L.push('No espera: se tira encima.');
    else if (D.golpes.t > 60 && pm < 15) L.push('Espera. Mira mucho y golpea poco.');
    if (D.tejados >= 2) L.push('Sube a los tejados como los gatos.');
    if (D.casas >= 2) L.push('Se mete en las casas de los curados, a esconderse con ellos.');
    if (D.cepos >= 1.5) L.push('Pisa los cepos. No mira dónde pone los pies.');
    // (lo que le entra más que lo demás, no lo que entra a todos)
    let mejor = null,
      suma = 0,
      cuantos = 0;
    // (la sierra no cuenta: de tres tajos, alguno entra casi siempre)
    for (const k in D.entra) {
      const E = D.entra[k];
      if (E.n < 3 || k === 'sierra') continue;
      suma += E.entra / E.n;
      cuantos++;
    }
    const media = cuantos ? suma / cuantos : 1;
    for (const k in D.entra) {
      const E = D.entra[k];
      const q = E.entra / E.n;
      if (k !== 'sierra' && E.n >= 3 && q > 0.5 && q > media + 0.2 && (!mejor || q > mejor[1])) mejor = [k, q];
    }
    const NOM = { barrido: 'la vara de lado', pica: 'la punta de la vara', gancho: 'el gancho', esponja: 'la esponja', sierra: 'la sierra', lanceta: 'la lanceta', trepano: 'el trépano', cauterio: 'el hierro al rojo', cauterioPica: 'el hierro al rojo', cal: 'la cal' };
    if (mejor && NOM[mejor[0]]) L.push(`No sabe qué hacer con ${NOM[mejor[0]]}.`);
    if (D.dormido >= 1) L.push(D.dormido >= 2 ? `Se me ha dormido ${Math.round(D.dormido)} veces. Despierta en la camilla y no se acuerda.` : 'Se me ha dormido una vez. Despierta y no se acuerda.');
    if (D.muertes >= 1) L.push(D.muertes >= 2 ? `Ha caído ${Math.round(D.muertes)} veces y se levanta siempre. Eso también es un síntoma.` : 'Ha caído una vez, y se ha levantado.');
    if (D.suelta >= 2) L.push('Se suelta de la esponja. Tiene fuerza en los brazos.');
    return { sintomas: L, tratamiento: T };
  }
  // El texto que se añade a la hoja (vacío si aún no ha visto nada).
  texto() {
    const { sintomas, tratamiento } = this.lineas();
    if (!sintomas.length) return '';
    let s = '\n\n(Debajo, en otra tinta, la letra más apretada:)\n\nObservado:\n' + sintomas.map((l) => '— ' + l).join('\n');
    if (tratamiento.length) s += '\n\nTratamiento:\n' + tratamiento.map((l) => '— ' + l).join('\n');
    return s;
  }
}
