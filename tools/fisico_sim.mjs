// La pelea con el Físico en su sala, simplificada, para entrenar sus tácticas
// (tools/entrena_fisico.mjs) y medirlas deprisa: miles de peleas por minuto,
// en Node, sin el motor.
//
// Lo que copia del juego (de donde lo saca):
//  - la sala (world/level_barrio.js: BR.sala) y sus muebles: la mesa, el
//    brasero, los camastros, los bancos (las cajas de colisión a ras de suelo);
//  - los golpes del Físico, con sus tiempos, alcances y arcos, lo que
//    engancha, duerme, taladra, ciega o prende (entities/fisico.js:
//    FI_ATTACKS), sus tres tiempos (la máscara, el brasero) y su manera de
//    perder el equilibrio (entities/enemy.js: poise, parried);
//  - el jugador con la espada y el escudo: sus golpes (los tiempos de la
//    espada: weapons.js), la voltereta y el paso atrás (lo que dura y cuándo
//    no le tocan), el parry, la guardia, el aguante, las ampollas, la nube de
//    beleño (más lento), el fuego del suelo, la cal (ciego);
//  - los dos Coronados de la campanilla, a lo sencillo.
// La cabeza del Físico es la misma del juego (game/fisico_mente.js) y lo que
// apunta de ti, la misma historia clínica (game/fisico_historia.js).
//
// Los jugadores de prueba (ESTILOS) reaccionan con su retraso de persona a lo
// que ven, ruedan hacia su lado, desvían, se cubren, beben, huyen,
// castigan... y unos se dejan engañar por un amago o un golpe retenido más
// que otros (lectura).
//
//   node tools/fisico_sim.mjs [estilo|todos] [peleas] [red|manual] [vida 0..1]
import { Mente, Red, OP, OPCIONES, N_MOV, N_OUT, GOLPE_DE, AMAGA, DIST, RETIENE, AMAGO_EN, ENTRE_AMAGOS, PE, ALIENTO, respira, rumbo } from '../src/game/fisico_mente.js';
import { Historia } from '../src/game/fisico_historia.js';
import { SALA, OBST, BRASERO_ANTE, SALE, EN_SU_MESA, ENTRA, HUECO, TIPO, ATK, APUNTA, puede, PL, RESISTE, ESTILOS, estilo, historiaDe } from './fisico_datos.mjs';
import { Bot } from './fisico_bot.mjs';

export { ESTILOS, estilo, historiaDe, ATK };

export const DT = 1 / 30;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const angTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
const approach = (a, b, step) => {
  const d = wrap(b - a);
  return Math.abs(d) <= step ? b : a + Math.sign(d) * step;
};
const damp = (v, target, k, dt) => target + (v - target) * Math.exp(-k * dt);

export function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r());
};

function choca(b) {
  const r = b.r;
  for (const o of OBST) {
    const cx = clamp(b.x, o[0], o[2]),
      cz = clamp(b.z, o[1], o[3]);
    const dx = b.x - cx,
      dz = b.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      b.x = cx + (dx / d) * r;
      b.z = cz + (dz / d) * r;
    } else {
      // (dentro: por el lado más cercano)
      const l = b.x - o[0],
        rr = o[2] - b.x,
        t = b.z - o[1],
        bb = o[3] - b.z;
      const m = Math.min(l, rr, t, bb);
      if (m === l) b.x = o[0] - r;
      else if (m === rr) b.x = o[2] + r;
      else if (m === t) b.z = o[1] - r;
      else b.z = o[3] + r;
    }
  }
  b.x = clamp(b.x, SALA.x0 + r, SALA.x1 - r);
  b.z = clamp(b.z, SALA.z0 + r, SALA.z1 - r);
}
function libre(x, z, r) {
  if (x < SALA.x0 + r || x > SALA.x1 - r || z < SALA.z0 + r || z > SALA.z1 - r) return false;
  for (const o of OBST) if (x > o[0] - r && x < o[2] + r && z > o[1] - r && z < o[3] + r) return false;
  return true;
}
function linea(ax, az, bx, bz, r) {
  const d = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.ceil(d / 0.25));
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    if (!libre(ax + (bx - ax) * k, az + (bz - az) * k, r)) return false;
  }
  return true;
}
// la rejilla para andar (A*, de 0,3 m, con los muebles engordados medio metro)
const NAV = (() => {
  const res = 0.3;
  const w = Math.ceil((SALA.x1 - SALA.x0) / res),
    h = Math.ceil((SALA.z1 - SALA.z0) / res);
  const ok = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) ok[j * w + i] = libre(SALA.x0 + (i + 0.5) * res, SALA.z0 + (j + 0.5) * res, 0.45) ? 1 : 0;
  return { res, w, h, ok };
})();
function camino(ax, az, bx, bz) {
  const { res, w, h, ok } = NAV;
  const ci = (x) => clamp(Math.floor((x - SALA.x0) / res), 0, w - 1);
  const cj = (z) => clamp(Math.floor((z - SALA.z0) / res), 0, h - 1);
  const near = (i, j) => {
    if (ok[j * w + i]) return j * w + i;
    for (let r = 1; r < 6; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          const ii = i + di,
            jj = j + dj;
          if (ii >= 0 && jj >= 0 && ii < w && jj < h && ok[jj * w + ii]) return jj * w + ii;
        }
    return -1;
  };
  const s = near(ci(ax), cj(az)),
    g = near(ci(bx), cj(bz));
  if (s < 0 || g < 0) return null;
  const N = w * h;
  const gs = new Float32Array(N).fill(1e9);
  const from = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  const open = [s];
  gs[s] = 0;
  const gi = g % w,
    gj = (g / w) | 0;
  const hh = (k) => Math.hypot((k % w) - gi, ((k / w) | 0) - gj);
  let it = 0;
  while (open.length && it++ < 3000) {
    let bi = 0,
      bf = 1e9;
    for (let q = 0; q < open.length; q++) {
      const f = gs[open[q]] + hh(open[q]);
      if (f < bf) {
        bf = f;
        bi = q;
      }
    }
    const k = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (k === g) break;
    if (done[k]) continue;
    done[k] = 1;
    const i = k % w,
      j = (k / w) | 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di,
          jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue;
        const kk = jj * w + ii;
        if (!ok[kk] || done[kk]) continue;
        if (di && dj && (!ok[j * w + ii] || !ok[jj * w + i])) continue;
        const c = gs[k] + (di && dj ? 1.414 : 1);
        if (c < gs[kk]) {
          gs[kk] = c;
          from[kk] = k;
          open.push(kk);
        }
      }
  }
  if (from[g] < 0 && g !== s) return null;
  const pts = [];
  for (let k = g; k >= 0 && k !== s; k = from[k]) pts.push([SALA.x0 + ((k % w) + 0.5) * res, SALA.z0 + (((k / w) | 0) + 0.5) * res]);
  pts.reverse();
  return pts;
}
// (lo que hay hasta la pared, desde (x, z) en la dirección (ux, uz))
function pared(x, z, ux, uz) {
  let t = 99;
  if (ux > 1e-6) t = Math.min(t, (SALA.x1 - x) / ux);
  if (ux < -1e-6) t = Math.min(t, (SALA.x0 - x) / ux);
  if (uz > 1e-6) t = Math.min(t, (SALA.z1 - z) / uz);
  if (uz < -1e-6) t = Math.min(t, (SALA.z0 - z) / uz);
  return Math.max(0, t);
}

// ------------------------------------------------------------ la pelea
// op: { red (Red o null), estilo (nombre), seed, vida (0..1), tmax,
// historia (Historia, o null: una sin nada), dureza: { reaccion, temp } }
export function pelea(op = {}) {
  const r = rng32(op.seed ?? 1);
  const S = op.estiloObj || estilo(op.estilo || 'agresivo', r);
  const H = op.historia || new Historia();
  H.encuentro('pelea');
  const tmax = op.tmax ?? 200;
  const mente = new Mente(op.red ?? null, { rng: r, reaccion: op.reaccion, temp: op.temp });
  const st = { t: 0, dado: 0, recibido: 0, muertes: 0, aire: 0, lejos: 0, golpes: {}, entran: {}, ops: new Array(N_OUT).fill(0), amagos: 0, retenidos: 0, apuntados: 0, duerme: 0, agarra: 0, trepana: 0, cegado: 0, curas: 0, desvios: 0, cubiertos: 0, esquivas: 0, engancha: 0, fin: null, fases: [], fuente: {}, jGolpes: 0, leDa: 0, jRuedas: 0, jDesvia: 0, dSum: 0, lejosT: 0, est: {}, dGolpe: {} };
  const vida0 = Math.round(960 * (op.vida ?? 1));
  const enc = vida0 <= 480;
  // él
  const F = {
    x: enc ? EN_SU_MESA.x : SALE.x,
    z: enc ? EN_SU_MESA.z : SALE.z,
    r: 0.42,
    vx: 0,
    vz: 0,
    yaw: 0,
    hp: vida0,
    maxHp: 960,
    fase: 1,
    estado: 'libre',
    stT: 0,
    atk: null,
    hitDone: [],
    evDone: [],
    res: null,
    minD: 99,
    cd: 0.8,
    poise: 70,
    poiseT: 0,
    aliento: ALIENTO.max,
    parryHits: 0,
    lastParriedT: -9,
    D: { hookT: -99, spongeT: -99, trepT: -99, humoT: -99, calT: -99, llamo: false, eligeT: -1 },
    aim: 0,
    reten: false,
    amago: false,
    serial: 0,
    finT: -9,
    guion: null,
    op: OP.acecha,
    path: null,
    pathT: 0,
    clock: 1,
  };
  // el jugador
  const P = {
    x: ENTRA.x,
    z: ENTRA.z,
    r: 0.36,
    vx: 0,
    vz: 0,
    yaw: Math.PI / 2,
    hp: 100,
    maxHp: 100,
    st: 100,
    stDelay: 0,
    flasks: 3,
    estado: 'libre',
    stT: 0,
    atk: null,
    combo: 0,
    hitSet: new Set(),
    parryWin: 0,
    parryN: [],
    blocking: false,
    blockW: 0,
    iframe: false,
    rollDir: [0, 0],
    rollBack: false,
    lento: 1,
    ciego: 0,
    grace: 0,
    mash: 0,
    drank: false,
    fuegoT: 0,
  };
  F.yaw = angTo(F.x, F.z, P.x, P.z);
  // los suyos (la campanilla), las nubes, el fuego
  const coros = [];
  const nubes = [];
  const fuegos = [];
  const citas = [];
  let t = 0;
  const dt = DT;

  // ------------------------------------------------------------ él: los golpes
  const golpea = (a) => {
    if (P.hp <= 0) return false;
    const d = Math.hypot(P.x - F.x, P.z - F.z);
    if (d > a.range + P.r) return false;
    const ang = Math.abs(wrap(angTo(F.x, F.z, P.x, P.z) - F.yaw));
    if (d > F.r + 0.6 && ang > a.arc * 0.5 * DEG) return false;
    return recibe(a, F.x, F.z);
  };
  // (player.receiveHit)
  const quita = (k, n) => (st.fuente[k] = (st.fuente[k] || 0) + n);
  const recibe = (a, sx, sz) => {
    if (P.grace > 0) return 'dodge';
    const hp0 = P.hp;
    const r = recibe0(a, sx, sz);
    if (P.hp < hp0) quita((a.name || 'coronado') + (r === 'guardbreak' ? ' (rompe)' : r === 'block' ? ' (cubierto)' : ''), hp0 - P.hp);
    return r;
  };
  const recibe0 = (a, sx, sz) => {
    if (P.iframe) {
      st.esquivas++;
      return 'dodge';
    }
    const toSrc = angTo(P.x, P.z, sx, sz);
    const fa = Math.abs(wrap(P.yaw - toSrc));
    const dmg = Math.round((a.dmg || 0) * (1 - (TIPO[a.tipo] || 0)));
    if (P.parryWin > 0 && fa < 100 * DEG && !a.noParry && P.st > 0) {
      P.parryWin = 0;
      P.parryN.length = 0;
      P.estado = 'desvio';
      P.stT = 0;
      P.yaw = toSrc;
      P.st = Math.min(100, P.st + 8);
      st.desvios++;
      return 'parry';
    }
    if (P.blocking && P.blockW > 0.5 && fa < 80 * DEG && P.st > 0) {
      P.st -= a.stDmg ?? (a.dmg || 0) * 1.1;
      P.stDelay = 0.75;
      const d = Math.hypot(sx - P.x, sz - P.z) || 1;
      P.vx = ((P.x - sx) / d) * 3.2;
      P.vz = ((P.z - sz) / d) * 3.2;
      if (P.st <= 0) {
        P.hp -= Math.round(dmg * 0.5);
        st.dado += Math.round(dmg * 0.5);
        P.estado = 'tambalea';
        P.stT = 0;
        P.blocking = false;
        return 'guardbreak';
      }
      const chip = Math.round(dmg * 0.08);
      P.hp -= chip;
      st.dado += chip;
      P.estado = 'parando';
      P.stT = 0;
      st.cubiertos++;
      return 'block';
    }
    P.hp -= dmg;
    st.dado += dmg;
    const d = Math.hypot(sx - P.x, sz - P.z) || 1;
    const kb = a.knock ?? (dmg >= 30 ? 6 : 3.5);
    P.vx = ((P.x - sx) / d) * kb;
    P.vz = ((P.z - sz) / d) * kb;
    P.blocking = false;
    P.estado = dmg >= 30 || a.stagger ? 'tambalea' : 'herido';
    P.stT = 0;
    P.yaw = toSrc;
    P.atk = null;
    return 'hit';
  };
  const muerdeJugador = (n) => {
    if (P.grace > 0) return;
    quita('mordisco', n);
    P.hp -= n;
    st.dado += n;
  };
  // (player.releaseGrab)
  const suelta = (knock, fx, fz, dmg) => {
    const n = Math.round(dmg * 0.9);
    quita('agarre', n);
    P.hp -= n;
    st.dado += n;
    P.estado = 'tambalea';
    P.stT = 0;
    P.vx = fx * knock;
    P.vz = fz * knock;
  };
  const enArco = (maxD, minD, arc) => {
    const d = Math.hypot(P.x - F.x, P.z - F.z);
    const a = Math.abs(wrap(F.yaw - angTo(F.x, F.z, P.x, P.z)));
    return d <= maxD && d >= minD && a <= arc;
  };
  const EV = {
    engancha() {
      if (P.iframe || P.estado === 'rueda' || P.estado === 'cogido' || P.grace > 0) return;
      const d = Math.hypot(P.x - F.x, P.z - F.z);
      if (!enArco(4.0, 0.9, 22 * DEG)) return;
      const fx = Math.sin(F.yaw),
        fz = Math.cos(F.yaw);
      suelta(Math.min(7, 2.2 + d * 1.4), -fx, -fz, 9);
      st.engancha++;
      F.D.hookT = t;
      F.res = 'entra';
      H.resultado('gancho', 'entra');
    },
    esponja() {
      if (P.iframe || P.estado === 'cogido' || P.grace > 0 || F.estado !== 'ataca') return;
      if (!enArco(1.55, 0, 55 * DEG)) return;
      P.estado = 'cogido';
      P.stT = 0;
      P.mash = 0;
      F.estado = 'sedando';
      F.stT = 0;
      F.atk = null;
      F.D.spongeT = t;
      F.res = 'entra';
      st.agarra++;
      H.resultado('esponja', 'entra');
    },
    taladra() {
      if (P.iframe || P.estado === 'cogido' || P.grace > 0 || F.estado !== 'ataca') return;
      if (!enArco(1.6, 0, 50 * DEG)) return;
      P.estado = 'cogido';
      P.stT = 0;
      P.mash = 0;
      F.estado = 'trepanando';
      F.stT = 0;
      F.atk = null;
      F.D.trepT = t;
      F.drillT = 0;
      F.res = 'entra';
      st.trepana++;
      H.resultado('trepano', 'entra');
    },
    cal() {
      const d = Math.hypot(P.x - F.x, P.z - F.z);
      const a = Math.abs(wrap(angTo(F.x, F.z, P.x, P.z) - F.yaw));
      if (d < 5.5 && a < 0.5 && !P.iframe && P.grace <= 0) {
        muerdeJugador(6);
        P.ciego = 3.2;
        st.cegado++;
        F.res = 'entra';
        H.resultado('cal', 'entra');
      }
    },
    sahumerio() {
      F.D.humoT = t;
      nubes.push({ x: P.x + P.vx * 0.4, z: P.z + P.vz * 0.4, t: 9 });
    },
    llama() {
      F.D.llamo = true;
      for (let i = 0; i < 2; i++)
        citas.push({
          t: t + 0.9 + i * 1.3,
          fn: () => coros.push({ x: HUECO.x + (i ? 1.0 : -0.2), z: HUECO.z - 0.3 + i * 0.2, r: 0.36, vx: 0, vz: 0, yaw: Math.PI, hp: 74, poise: 26, estado: 'libre', stT: 0, cd: 0.8, atkHit: false }),
        });
    },
    prende() {
      const x = F.x + Math.sin(F.yaw) * 1.9,
        z = F.z + Math.cos(F.yaw) * 1.9;
      if (fuegos.length >= 4 || x < SALA.x0 || x > SALA.x1 || z < SALA.z0 || z > SALA.z1) return;
      fuegos.push({ x, z, t: 7, tick: 0 });
    },
  };
  const empieza = (k, o = {}) => {
    const a = ATK[k];
    F.estado = 'ataca';
    F.atk = a;
    F.stT = 0;
    F.hitDone = [];
    F.evDone = [];
    F.res = null;
    F.minD = 99;
    F.serial++;
    F.reten = !!o.reten;
    F.amago = !!o.amago;
    F.aliento = Math.max(0, F.aliento - (ALIENTO.coste[o.amago ? 'amago' : k] ?? 0));
    F.aim = o.aim || 0;
    st.golpes[k] = (st.golpes[k] || 0) + (o.amago ? 0 : 1);
    if (o.amago) st.amagos++;
    if (o.reten) st.retenidos++;
    if (o.aim) st.apuntados++;
    if (k === 'cal') F.D.calT = t;
    // (retenido, el impacto llega más tarde)
    const ret = o.reten ? a.first * RETIENE.hasta * (1 / RETIENE.paso - 1) : 0;
    H.ataca(k, t, a.first + ret, a.dur + ret, !!o.amago);
  };
  // a dónde apuntar: adonde rodarás (lo apuntado)
  const apunta = (k) => {
    const lp = H.ladoProbable();
    const max = APUNTA[k];
    if (!lp || !max || r() > lp.k) return 0;
    const ux = F.x - P.x,
      uz = F.z - P.z;
    const m = Math.hypot(ux, uz) || 1;
    // (tu izquierda, mirándole)
    const s = lp.lado === 'l' ? 1 : -1;
    const qx = P.x + (uz / m) * 2.2 * s,
      qz = P.z + (-ux / m) * 2.2 * s;
    const off = wrap(angTo(F.x, F.z, qx, qz) - angTo(F.x, F.z, P.x, P.z));
    return clamp(off, -max * DEG, max * DEG);
  };
  const retiene = (k) => {
    const R = H.rasgos();
    const p = clamp(0.06 + R.pronto * R.seguro * 1.3, 0, 0.6);
    return APUNTA[k] !== undefined && ATK[k].first > 0.45 && r() < p;
  };
  // (enemy.parried)
  const desviado = () => {
    F.parryHits = (t - F.lastParriedT < 4 ? F.parryHits : 0) + 1;
    F.lastParriedT = t;
    F.atk = null;
    F.clock = 1;
    if (F.parryHits < 2) {
      F.estado = 'herido';
      F.stT = 0;
      F.cd = Math.max(F.cd, 0.6);
      return;
    }
    F.parryHits = 0;
    F.estado = 'deseq';
    F.stT = 0;
  };

  // ------------------------------------------------------------ lo que ve él
  const obs = () => {
    const dx = P.x - F.x,
      dz = P.z - F.z;
    const d = Math.hypot(dx, dz) || 1e-3;
    const ux = dx / d,
      uz = dz / d;
    const pe =
      P.estado === 'ataca' ? PE.ataca : P.estado === 'rueda' ? PE.rueda : P.estado === 'bebe' ? PE.bebe : P.estado === 'cogido' ? PE.cogido : P.estado === 'herido' || P.estado === 'tambalea' || P.estado === 'parando' ? PE.herido : P.blocking ? PE.cubre : PE.libre;
    const dur = P.estado === 'ataca' && P.atk ? P.atk.dur : P.estado === 'rueda' ? (P.rollBack ? 0.46 : 0.64) : P.estado === 'bebe' ? 1.15 : 1;
    let nube = 0;
    for (const n of nubes) if (Math.hypot(P.x - n.x, P.z - n.z) < 2.4) nube = 1;
    return { t, d, rel: wrap(angTo(F.x, F.z, P.x, P.z) - F.yaw), vr: -(P.vx * ux + P.vz * uz), vl: P.vx * uz - P.vz * ux, pe, pk: clamp(P.stT / dur, 0, 1), php: P.hp / P.maxHp, pst: P.st / 100, pfr: P.flasks / 3, paredEl: pared(P.x, P.z, ux, uz), nube };
  };
  const yo = () => {
    const dx = P.x - F.x,
      dz = P.z - F.z;
    const d = Math.hypot(dx, dz) || 1e-3;
    return {
      hp: F.hp / F.maxHp,
      fase: F.fase,
      cd: Math.max(0, F.cd),
      aliento: F.aliento,
      desde: t - F.finT,
      paredYo: pared(F.x, F.z, -dx / d, -dz / d),
      coronados: coros.filter((c) => c.hp > 0).length,
      fuegos: fuegos.length,
      listo: [puede(F, t, 'gancho'), puede(F, t, 'esponja'), puede(F, t, 'sahumerio'), puede(F, t, 'trepano'), puede(F, t, 'cal')],
    };
  };
  const M = new Uint8Array(N_OUT);
  const mascara = (o) => {
    M.fill(0);
    for (let i = 0; i < N_MOV; i++) M[i] = 1;
    if (F.cd > 0) return M;
    for (let i = N_MOV; i < N_OUT; i++) {
      const k = OPCIONES[i];
      const g = k === 'amago' ? AMAGA[F.fase] : GOLPE_DE[k];
      if (!g || !puede(F, t, g)) continue;
      const a = ATK[g];
      if (o.d < a.min || o.d > a.max) continue;
      if (k === 'amago' && t - mente.amagoT < ENTRE_AMAGOS) continue;
      if (F.aliento < (k === 'amago' ? ALIENTO.coste.amago : ALIENTO.coste[g] ?? 0)) continue;
      M[i] = 1;
    }
    return M;
  };

  // ------------------------------------------------------------ él: cada fotograma
  const steer = (tx, tz, spd, face) => {
    const dx = tx - F.x,
      dz = tz - F.z;
    const d = Math.hypot(dx, dz);
    let wx = 0,
      wz = 0;
    if (d > 0.05) {
      wx = dx / d;
      wz = dz / d;
    }
    for (const c of coros) {
      if (c.hp <= 0) continue;
      const ox = F.x - c.x,
        oz = F.z - c.z;
      const od = Math.hypot(ox, oz);
      const min = F.r + c.r + 0.3;
      if (od < min && od > 1e-3) {
        wx += (ox / od) * (min - od) * 1.5;
        wz += (oz / od) * (min - od) * 1.5;
      }
    }
    const m = Math.hypot(wx, wz) || 1;
    const k = Math.min(1, d / 0.6);
    F.vx = damp(F.vx, (wx / m) * spd * k, 8, dt);
    F.vz = damp(F.vz, (wz / m) * spd * k, 8, dt);
    if (face && d > 0.1) F.yaw = approach(F.yaw, Math.atan2(wx, wz), 3.4 * dt);
  };
  const chaseTo = (tx, tz, spd) => {
    if (linea(F.x, F.z, tx, tz, 0.4)) {
      F.path = null;
      return steer(tx, tz, spd, true);
    }
    F.pathT -= dt;
    if (!F.path || F.pathT <= 0) {
      F.path = camino(F.x, F.z, tx, tz);
      F.pathT = 0.8;
    }
    if (F.path && F.path.length) {
      const [px, pz] = F.path[0];
      if (Math.hypot(px - F.x, pz - F.z) < 0.5) F.path.shift();
      if (F.path.length) return steer(F.path[0][0], F.path[0][1], spd, true);
    }
    steer(tx, tz, spd, true);
  };
  const piensa = () => {
    // los tiempos: la máscara, el brasero
    const k = F.hp / F.maxHp;
    if (F.fase === 1 && k <= 0.5) {
      F.estado = 'guion';
      F.stT = 0;
      F.guion = { k: 'mascara' };
      return;
    }
    if (F.fase === 2 && k <= 0.25) {
      F.estado = 'guion';
      F.stT = 0;
      F.guion = { k: 'brasero', llega: null };
      return;
    }
    const d = Math.hypot(P.x - F.x, P.z - F.z);
    // tras engancharte, la esponja (entities/fisico.js: think)
    if (t - F.D.hookT < 1.3 && d < 2.6 && P.estado !== 'cogido') {
      F.D.hookT = -99;
      empieza('esponja');
      return;
    }
    // la campanilla: con sitio (lejos de ti), o a los 8 s de poder
    if (F.fase === 1 && F.hp < F.maxHp * 0.82 && !F.D.llamo && F.cd <= 0) {
      if (F.D.eligeT < 0) F.D.eligeT = t;
      if (d > 4 || t - F.D.eligeT > 8) {
        empieza('campanilla');
        return;
      }
    }
    if (mente.toca(t)) {
      const op = mente.decide(t, yo(), H.rasgos(), mascara);
      if (op >= 0) {
        st.ops[op]++;
        F.op = op;
        if (op >= N_MOV) {
          const amago = op === OP.amago;
          const g = amago ? AMAGA[F.fase] : GOLPE_DE[OPCIONES[op]];
          empieza(g, { amago, reten: !amago && retiene(g), aim: apunta(g) });
          return;
        }
      }
    }
    // el movimiento de lo que ha decidido
    const o = mente.o;
    if (F.op === OP.espera || !o) {
      F.vx = damp(F.vx, 0, 8, dt);
      F.vz = damp(F.vz, 0, 8, dt);
    } else if (F.op === OP.acerca) {
      chaseTo(P.x, P.z, rumbo(OP.acerca, F.x, F.z, P.x, P.z, DIST[F.fase], 1.2, 3.4)[2]);
    } else {
      const R = rumbo(F.op, F.x, F.z, P.x, P.z, DIST[F.fase], 1.2, 3.4, mente.lado);
      if (R) steer(R[0], R[1], R[2], false);
    }
    if (F.op !== OP.acerca) F.yaw = approach(F.yaw, angTo(F.x, F.z, P.x, P.z), 3.4 * dt);
    if (F.op === OP.espera || F.op === OP.aparta) {
      if (d > 5) st.lejos += dt;
    }
  };
  const fisico = () => {
    F.stT += F.estado === 'ataca' ? dt * F.clock : dt;
    F.aliento = respira(F.aliento, dt, F.estado === 'ataca');
    F.cd -= dt;
    F.poiseT -= dt;
    if (F.poiseT <= 0) F.poise = 70;
    const d = Math.hypot(P.x - F.x, P.z - F.z);
    switch (F.estado) {
      case 'libre':
        piensa();
        break;
      case 'ataca': {
        const a = F.atk;
        // (el golpe retenido: su reloj, más despacio hasta casi el impacto)
        F.clock = F.reten && F.stT < a.first * RETIENE.hasta ? RETIENE.paso : 1;
        const tt = F.stT;
        if (F.amago && tt >= a.first * AMAGO_EN) {
          F.estado = 'libre';
          F.atk = null;
          F.cd = 0;
          F.finT = t;
          F.clock = 1;
          mente.pronto(t, 0.05);
          break;
        }
        if (tt < a.track) F.yaw = approach(F.yaw, angTo(F.x, F.z, P.x, P.z) + F.aim, 3.4 * dt);
        let lunging = false;
        if (a.lunge)
          for (const [l0, l1, ls] of a.lunge)
            if (tt >= l0 && tt <= l1) {
              F.vx = Math.sin(F.yaw) * ls;
              F.vz = Math.cos(F.yaw) * ls;
              lunging = true;
            }
        if (!lunging) {
          F.vx = damp(F.vx, 0, 10, dt);
          F.vz = damp(F.vz, 0, 10, dt);
        }
        for (let i = 0; i < a.hits.length; i++) {
          const [h0, h1] = a.hits[i];
          if (tt >= h0 && tt <= h1) {
            F.minD = Math.min(F.minD, d);
            if (!F.hitDone[i]) {
              const rr = golpea(a);
              if (rr) {
                F.hitDone[i] = true;
                const R = rr === 'hit' ? 'entra' : rr === 'block' ? 'cubre' : rr === 'guardbreak' ? 'rompe' : rr === 'parry' ? 'desvia' : 'esquiva';
                F.res = F.res === 'entra' ? 'entra' : R;
                H.resultado(a.name, R);
                if (rr === 'hit' || rr === 'guardbreak') st.entran[a.name] = (st.entran[a.name] || 0) + 1;
                if (rr === 'parry') {
                  desviado();
                  return;
                }
              }
            }
          }
        }
        if (a.ev)
          for (let i = 0; i < a.ev.length; i++)
            if (tt >= a.ev[i] && !F.evDone[i]) {
              F.evDone[i] = true;
              F.minD = Math.min(F.minD, d);
              EV[a.fn]();
              if (F.estado !== 'ataca') return;
            }
        if (tt >= a.dur) {
          // ¿al aire? (sin nada que le dé ni le pare, y lejos de su alcance)
          if (!F.res && a.name !== 'campanilla' && a.name !== 'sahumerio' && F.minD > a.range + 0.8) st.aire++;
          H.cierra();
          F.estado = 'libre';
          F.atk = null;
          F.cd = a.cd;
          F.finT = t;
          F.clock = 1;
          mente.pronto(t, 0.12);
        }
        break;
      }
      case 'herido':
      case 'tambalea':
      case 'deseq': {
        F.vx = damp(F.vx, 0, 5, dt);
        F.vz = damp(F.vz, 0, 5, dt);
        const dur = F.estado === 'herido' ? 0.6 : F.estado === 'tambalea' ? 1.4 : 1.5;
        if (F.stT >= dur) {
          F.cd = F.estado === 'deseq' ? 0.35 + r() * 0.3 : 0.2 + r() * 0.4;
          F.estado = 'libre';
          mente.pronto(t, 0.1);
        }
        break;
      }
      case 'sedando': {
        F.vx = damp(F.vx, 0, 10, dt);
        F.vz = damp(F.vz, 0, 10, dt);
        if (P.estado !== 'cogido') {
          F.estado = 'libre';
          break;
        }
        P.x = damp(P.x, F.x + Math.sin(F.yaw) * 0.78, 12, dt);
        P.z = damp(P.z, F.z + Math.cos(F.yaw) * 0.78, 12, dt);
        if (P.mash >= 9) {
          P.estado = 'tambalea';
          P.stT = 0;
          P.vx = Math.sin(F.yaw) * 2.4;
          P.vz = Math.cos(F.yaw) * 2.4;
          F.estado = 'tambalea';
          F.stT = 0;
          H.evento('suelta');
        } else if (F.stT > 2.8) {
          suelta(1.5, Math.sin(F.yaw), Math.cos(F.yaw), 28);
          F.estado = 'libre';
          F.cd = 1.2;
          st.duerme++;
          H.evento('dormido');
        }
        break;
      }
      case 'trepanando': {
        F.vx = damp(F.vx, 0, 10, dt);
        F.vz = damp(F.vz, 0, 10, dt);
        if (P.estado !== 'cogido') {
          F.estado = 'libre';
          break;
        }
        P.x = damp(P.x, F.x + Math.sin(F.yaw) * 0.74, 12, dt);
        P.z = damp(P.z, F.z + Math.cos(F.yaw) * 0.74, 12, dt);
        F.drillT -= dt;
        if (F.stT > 0.6 && F.drillT <= 0) {
          F.drillT = 0.32;
          muerdeJugador(2);
        }
        if (P.mash >= 10) {
          P.estado = 'tambalea';
          P.stT = 0;
          P.vx = Math.sin(F.yaw) * 2.4;
          P.vz = Math.cos(F.yaw) * 2.4;
          F.estado = 'tambalea';
          F.stT = 0;
          H.evento('suelta');
        } else if (F.stT > 3.0) {
          suelta(4.5, Math.sin(F.yaw), Math.cos(F.yaw), 30);
          F.estado = 'libre';
          F.cd = 1.4;
        }
        break;
      }
      case 'guion': {
        const G = F.guion;
        if (G.k === 'mascara') {
          F.vx = damp(F.vx, 0, 8, dt);
          F.vz = damp(F.vz, 0, 8, dt);
          if (F.stT >= 2.8) finGuion(2);
        } else {
          if (G.llega == null) {
            if (Math.hypot(BRASERO_ANTE[0] - F.x, BRASERO_ANTE[1] - F.z) > 0.35 && F.stT < 4) chaseTo(BRASERO_ANTE[0], BRASERO_ANTE[1], 1.92);
            else G.llega = F.stT;
          } else {
            F.vx = damp(F.vx, 0, 8, dt);
            F.vz = damp(F.vz, 0, 8, dt);
            if (F.stT - G.llega >= 2.0) finGuion(3);
          }
        }
        break;
      }
    }
  };
  const finGuion = (fase) => {
    F.guion = null;
    F.fase = fase;
    F.estado = 'libre';
    F.stT = 0;
    F.cd = 0.6;
    st.fases.push([+t.toFixed(1), fase]);
    mente.pronto(t, 0.1);
  };
  // (los golpes del jugador en él: combat.playerStrike, enemy.takeHit y su
  // preHit)
  const daFisico = (def) => {
    if (F.estado === 'guion') return;
    let dmg = Math.round(def.dmg * RESISTE);
    let poise = def.poise;
    if (F.estado === 'sedando' || F.estado === 'trepanando') {
      dmg *= 0.5;
      poise = 0;
    }
    const lim = F.fase === 1 ? 0.5 : F.fase === 2 ? 0.25 : 0;
    const min = Math.ceil(F.maxHp * lim) - 1;
    if (lim && F.hp - dmg < min) dmg = Math.max(0, F.hp - min);
    F.hp -= dmg;
    st.recibido += dmg;
    if (dmg > 0) st.leDa++;
    if (F.hp <= 0) {
      F.hp = 0;
      st.fin = 'vencido';
      return;
    }
    F.poise -= poise;
    F.poiseT = 3;
    const dd = Math.hypot(F.x - P.x, F.z - P.z) || 1;
    F.vx += ((F.x - P.x) / dd) * 1.2;
    F.vz += ((F.z - P.z) / dd) * 1.2;
    if (F.poise <= 0 && F.estado !== 'sedando' && F.estado !== 'trepanando') {
      F.poise = 70;
      F.estado = def.heavy ? 'tambalea' : 'herido';
      F.stT = 0;
      const kb = def.heavy ? 3.5 : 2;
      F.vx = ((F.x - P.x) / dd) * kb;
      F.vz = ((F.z - P.z) / dd) * kb;
      if (F.atk) H.cierra();
      F.atk = null;
      F.clock = 1;
    }
  };

  // ------------------------------------------------------------ el jugador
  const useSt = (n) => {
    P.st = Math.max(-10, P.st - n);
    P.stDelay = 0.75;
  };
  const accion = (kind, info = {}) => H.accion(kind, info, { t, px: P.x, pz: P.z, ex: F.x, ez: F.z, hpK: P.hp / P.maxHp, d: Math.hypot(P.x - F.x, P.z - F.z) });
  const ataca = (def, idx) => {
    P.estado = 'ataca';
    P.stT = 0;
    P.atk = def;
    P.combo = idx;
    P.hitSet.clear();
    useSt(def.st);
    st.jGolpes++;
    {
      const d = Math.hypot(P.x - F.x, P.z - F.z);
      const k = d < 1.5 ? '<1.5' : d < 2.2 ? '1.5-2.2' : d < 2.8 ? '2.2-2.8' : d < 3.5 ? '2.8-3.5' : '>3.5';
      st.dGolpe[k] = (st.dGolpe[k] || 0) + 1;
    }
    if (!def.riposte) accion('attack', { heavy: !!def.heavy });
  };
  const rueda = (dx, dz, back) => {
    if (P.st <= 0) return false;
    P.estado = 'rueda';
    P.stT = 0;
    useSt(18);
    P.rollBack = !!back;
    const m = Math.hypot(dx, dz) || 1;
    P.rollDir = back ? [-Math.sin(P.yaw), -Math.cos(P.yaw)] : [dx / m, dz / m];
    if (!back) P.yaw = Math.atan2(dx, dz);
    P.blocking = false;
    st.jRuedas++;
    accion('roll', { x: P.rollDir[0], z: P.rollDir[1], back: !!back });
    return true;
  };
  const desvia = () => {
    P.parryN = P.parryN.filter((q) => t - q < 1);
    const k = [1, 0.75, 0.5, 0.34][Math.min(3, P.parryN.length)];
    P.parryN.push(t);
    P.parryWin = 0.2 * k;
    P.yaw = angTo(P.x, P.z, F.x, F.z);
    st.jDesvia++;
    accion('parryTry');
  };
  const bebe = () => {
    if (P.flasks <= 0) return;
    P.flasks--;
    P.estado = 'bebe';
    P.stT = 0;
    P.drank = false;
    P.blocking = false;
    st.curas++;
    accion('heal');
  };
  // el golpe del jugador alcanza a quien tenga delante
  const golpeJugador = (def) => {
    const tgts = [F, ...coros];
    for (const e of tgts) {
      if (e !== F && e.hp <= 0) continue;
      if (P.hitSet.has(e)) continue;
      const d = Math.hypot(e.x - P.x, e.z - P.z);
      if (d > def.range + e.r) continue;
      const a = Math.abs(wrap(angTo(P.x, P.z, e.x, e.z) - P.yaw));
      if (a > def.arc * 0.5 * DEG && d > P.r + e.r + 0.3) continue;
      P.hitSet.add(e);
      if (e === F) daFisico(def);
      else {
        e.hp -= def.riposte ? 999 : def.dmg;
        e.poise -= def.poise;
        if (e.poise <= 0) {
          e.poise = 26;
          e.estado = 'herido';
          e.stT = 0;
        }
      }
    }
  };
  const jugador = () => {
    P.stT += P.estado === 'ataca' ? dt * P.lento : dt;
    P.grace -= dt;
    P.ciego -= dt;
    P.parryWin = Math.max(0, P.parryWin - dt);
    P.stDelay -= dt;
    if (P.stDelay <= 0 && P.estado !== 'ataca' && P.estado !== 'rueda') P.st = Math.min(100, P.st + (P.blocking ? 20 : 45) * dt);
    P.iframe = false;
    const I = bot.I;
    const lockYaw = angTo(P.x, P.z, bot.tgt ? bot.tgt.x : F.x, bot.tgt ? bot.tgt.z : F.z);
    let want = null;
    switch (P.estado) {
      case 'libre': {
        P.blocking = !!I.cubre && P.st > 0;
        P.blockW = P.blocking ? Math.min(1, P.blockW + dt * 6) : 0;
        // (fijado en él: de lado o hacia él, a 3,6; corriendo, a 6,7)
        const spd = (P.blocking ? 1.9 : I.spd > 5 && P.st > 0 ? 6.7 : Math.min(3.6, I.spd)) * P.lento;
        want = [I.mx * spd, I.mz * spd];
        if (I.spd > 5) {
          P.st -= 14 * dt;
          P.stDelay = 0.3;
        }
        P.yaw = I.spd > 5 && Math.hypot(I.mx, I.mz) > 0.1 ? approach(P.yaw, Math.atan2(I.mx, I.mz), 9 * dt) : approach(P.yaw, lockYaw, 15 * dt);
        break;
      }
      case 'ataca': {
        const a = P.atk;
        const tt = P.stT;
        if (tt < a.hit[0]) P.yaw = approach(P.yaw, lockYaw, 6 * dt);
        // (la estocada, con su perfil; frena si ya está pegado a quien golpea:
        // player.js)
        if (tt >= a.lunge[0] && tt <= a.lunge[1]) {
          const tg = bot.tgt || F;
          const near = Math.hypot(tg.x - P.x, tg.z - P.z) < tg.r + P.r + 0.5;
          const u = (tt - a.lunge[0]) / (a.lunge[1] - a.lunge[0]);
          const sp = a.lunge[2] * Math.sin(Math.PI * u) * 1.45 * (near ? 0.15 : 1);
          P.vx = Math.sin(P.yaw) * sp;
          P.vz = Math.cos(P.yaw) * sp;
        } else {
          P.vx = damp(P.vx, 0, 12, dt);
          P.vz = damp(P.vz, 0, 12, dt);
        }
        if (tt >= a.hit[0] && tt <= a.hit[1]) golpeJugador(a);
        if (tt >= a.cancel && I.golpe === 'ligero' && !a.riposte && !a.heavy && P.combo < 2 && P.st > 0) {
          I.golpe = null;
          ataca(PL.light[P.combo + 1], P.combo + 1);
        } else if (tt >= a.cancel && I.rueda) {
          const R = I.rueda;
          I.rueda = null;
          I.accion = null;
          rueda(R[0], R[1], R[2]);
        } else if (tt >= a.cancel && I.accion === 'desvia') {
          I.accion = null;
          P.estado = 'libre';
          P.atk = null;
          desvia();
        } else if (tt >= a.dur) {
          P.estado = 'libre';
          P.atk = null;
        }
        break;
      }
      case 'rueda': {
        const dur = P.rollBack ? 0.46 : 0.64;
        const k = P.stT / dur;
        const ie = P.rollBack ? 0.26 : 0.42;
        P.iframe = P.rollBack ? P.stT > 0.03 && P.stT < ie : P.stT > 0.04 && P.stT < ie;
        const spd = P.rollBack ? 5.6 * Math.max(0, 1 - k * 1.6) : 7.6 * Math.pow(Math.max(0, 1 - k), 0.6);
        P.vx = P.rollDir[0] * spd;
        P.vz = P.rollDir[1] * spd;
        if (P.stT >= dur) P.estado = 'libre';
        break;
      }
      case 'bebe': {
        want = [I.mx * 1.3, I.mz * 1.3];
        if (!P.drank && P.stT >= 0.62) {
          P.drank = true;
          P.hp = Math.min(P.maxHp, P.hp + 45);
        }
        if (P.stT >= 1.15) P.estado = 'libre';
        break;
      }
      case 'desvio':
        want = [0, 0];
        if (P.stT >= 0.46) P.estado = 'libre';
        break;
      case 'parando':
        if (P.stT >= 0.3) P.estado = 'libre';
        break;
      case 'herido':
      case 'tambalea': {
        const dur = P.estado === 'herido' ? 0.42 : 1.0;
        P.vx = damp(P.vx, 0, 6, dt);
        P.vz = damp(P.vz, 0, 6, dt);
        if (P.stT >= dur) P.estado = 'libre';
        else if (P.estado === 'herido' && P.stT > 0.24 && I.rueda && P.st > 0) {
          const R = I.rueda;
          I.rueda = null;
          I.accion = null;
          rueda(R[0], R[1], R[2]);
        }
        break;
      }
      case 'cogido':
        P.vx = P.vz = 0;
        // (forcejea en cuanto se da cuenta)
        if (P.stT > S.reac + 0.25) P.mash += S.mash * (0.75 + r() * 0.5) * dt;
        break;
    }
    if (want) {
      P.vx = damp(P.vx, want[0], 14, dt);
      P.vz = damp(P.vz, want[1], 14, dt);
    }
    // (lo pulsado caduca: lo que no se ha podido hacer en un momento, se pierde)
    if (I.accion && t - (I.accionT ?? t) > 0.3) {
      I.accion = null;
      I.rueda = null;
    }
    if (P.estado === 'libre' && I.accion) {
      const A = I.accion;
      I.accion = null;
      if (A === 'rueda' && I.rueda) {
        const R = I.rueda;
        I.rueda = null;
        rueda(R[0], R[1], R[2]);
      } else if (A === 'desvia') desvia();
      else if (A === 'bebe') bebe();
      else if (A === 'ligero' && P.st > 0) ataca(PL.light[0], 0);
      else if (A === 'fuerte' && P.st > 0) ataca(PL.heavy, 0);
      else if (A === 'gracia') ataca(PL.riposte, 0);
    } else if (P.estado === 'libre' && I.golpe && P.st > 0) {
      ataca(I.golpe === 'fuerte' ? PL.heavy : PL.light[0], 0);
      I.golpe = null;
    }
    // (la nube: más lento; el fuego del suelo quema)
    P.lento = 1;
    for (const n of nubes) if (Math.hypot(P.x - n.x, P.z - n.z) < 2.4) P.lento = 0.55;
    for (const f of fuegos) {
      f.tick -= dt;
      if (Math.hypot(P.x - f.x, P.z - f.z) < 1.25 && f.tick <= 0 && !P.iframe && P.grace <= 0) {
        f.tick = 0.5;
        P.hp -= 6;
        st.dado += 6;
        quita('fuego', 6);
      }
    }
  };

  // ------------------------------------------------------------ el jugador de prueba
  // (fisico_bot.mjs: lo que ve de él, con su retraso; lo que quiere hacer)
  const bot = new Bot(S, r);
  const yoJ = { x: 0, z: 0, hp: 0, maxHp: 100, st: 0, flasks: 0, estado: 'libre', combo: 0, atkHeavy: false, atkRiposte: false, ciego: false, lento: false };
  const mundo = { fuegos, nubes, coros };
  const piensaBot = () => {
    bot.ve({ t, x: F.x, z: F.z, yaw: F.yaw, estado: F.estado, atk: F.atk ? F.atk.name : null, atkT: F.stT, serial: F.serial, amago: F.amago });
    yoJ.x = P.x;
    yoJ.z = P.z;
    yoJ.hp = P.hp;
    yoJ.st = P.st;
    yoJ.flasks = P.flasks;
    yoJ.estado = P.estado;
    yoJ.combo = P.combo;
    yoJ.atkHeavy = !!(P.atk && P.atk.heavy);
    yoJ.atkRiposte = !!(P.atk && P.atk.riposte);
    yoJ.ciego = P.ciego > 0;
    yoJ.lento = P.lento < 1;
    bot.piensa(t, dt, yoJ, mundo);
  };

  // ------------------------------------------------------------ los Coronados
  const coronados = () => {
    for (const c of coros) {
      if (c.hp <= 0) continue;
      c.stT += dt;
      c.cd -= dt;
      const d = Math.hypot(P.x - c.x, P.z - c.z);
      if (c.estado === 'herido') {
        c.vx = damp(c.vx, 0, 6, dt);
        c.vz = damp(c.vz, 0, 6, dt);
        if (c.stT > 0.5) {
          c.estado = 'libre';
          c.cd = 0.4;
        }
      } else if (c.estado === 'ataca') {
        c.vx = damp(c.vx, 0, 10, dt);
        c.vz = damp(c.vz, 0, 10, dt);
        if (c.stT < 0.55) c.yaw = approach(c.yaw, angTo(c.x, c.z, P.x, P.z), 4 * dt);
        if (c.stT >= 0.55 && c.stT <= 0.72) {
          c.vx = Math.sin(c.yaw) * 2.4;
          c.vz = Math.cos(c.yaw) * 2.4;
        }
        if (c.stT >= 0.6 && c.stT <= 0.74 && !c.atkHit) {
          const a = Math.abs(wrap(angTo(c.x, c.z, P.x, P.z) - c.yaw));
          if (d <= 2.0 + P.r && a < 45 * DEG) {
            const rr = recibe({ dmg: 15, range: 2, arc: 90 }, c.x, c.z);
            if (rr && rr !== 'dodge') c.atkHit = true;
            if (rr === 'parry') {
              c.estado = 'herido';
              c.stT = -1;
            }
          }
        }
        if (c.stT >= 1.45) {
          c.estado = 'libre';
          c.cd = 0.8 + r() * 0.8;
        }
      } else {
        if (d > 1.7) {
          const m = d || 1;
          c.vx = damp(c.vx, ((P.x - c.x) / m) * (d > 6 ? 2.5 : 1.6), 8, dt);
          c.vz = damp(c.vz, ((P.z - c.z) / m) * (d > 6 ? 2.5 : 1.6), 8, dt);
        } else {
          c.vx = damp(c.vx, 0, 8, dt);
          c.vz = damp(c.vz, 0, 8, dt);
        }
        c.yaw = approach(c.yaw, angTo(c.x, c.z, P.x, P.z), 4 * dt);
        if (d < 2.1 && c.cd <= 0) {
          c.estado = 'ataca';
          c.stT = 0;
          c.atkHit = false;
        }
      }
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      choca(c);
    }
  };

  // ------------------------------------------------------------ el bucle
  const sep = (a, b) => {
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    const min = a.r + b.r;
    if (d < min && d > 1e-4) {
      const k = (min - d) / d / 2;
      a.x -= dx * k;
      a.z -= dz * k;
      b.x += dx * k;
      b.z += dz * k;
    }
  };
  let muestraT = 0;
  let prevD = Math.hypot(P.x - F.x, P.z - F.z);
  while (t < tmax && !st.fin) {
    mente.ve(t, obs());
    piensaBot();
    for (let i = citas.length - 1; i >= 0; i--)
      if (t >= citas[i].t) {
        citas[i].fn();
        citas.splice(i, 1);
      }
    fisico();
    if (st.fin) break;
    jugador();
    coronados();
    // moverse
    if (P.estado !== 'cogido') {
      P.x += P.vx * dt;
      P.z += P.vz * dt;
    }
    F.x += F.vx * dt;
    F.z += F.vz * dt;
    if (P.estado !== 'cogido') sep(P, F);
    for (const c of coros) if (c.hp > 0) sep(P, c);
    choca(P);
    choca(F);
    for (let i = nubes.length - 1; i >= 0; i--) if ((nubes[i].t -= dt) <= 0) nubes.splice(i, 1);
    for (let i = fuegos.length - 1; i >= 0; i--) if ((fuegos[i].t -= dt) <= 0) fuegos.splice(i, 1);
    {
      const dd = Math.hypot(P.x - F.x, P.z - F.z);
      st.dSum += dd * dt;
      if (dd > 3.2) st.lejosT += dt;
      st.est[F.estado] = (st.est[F.estado] || 0) + dt;
    }
    // la historia: lo que te alejas, cada cuarto de segundo
    muestraT -= dt;
    if (muestraT <= 0) {
      const d = Math.hypot(P.x - F.x, P.z - F.z);
      H.muestra(0.25, d, (d - prevD) / 0.25, P.hp / P.maxHp);
      prevD = d;
      muestraT = 0.25;
    }
    // caes: te levantas ahí mismo (cuenta)
    if (P.hp <= 0) {
      st.muertes++;
      H.evento('muere');
      P.hp = 100;
      P.st = 100;
      P.flasks = 3;
      P.estado = 'libre';
      P.grace = 0;
      P.blocking = false;
      bot.plan = null;
      if (F.estado === 'sedando' || F.estado === 'trepanando') F.estado = 'libre';
    }
    t += dt;
  }
  st.t = t;
  if (!st.fin) st.fin = 'tiempo';
  st.vida = Math.round(F.hp);
  st.historia = H;
  st.estilo = S.nombre;
  return st;
}

// Lo que vale una pelea para él: lo que te quita (en vidas: 100) menos lo que
// le quitas (en cuartos de su vida: 240); y lo que quiere, que es dormirte (y
// antes, cogerte: el gancho que entra, la esponja y el trépano que agarran),
// aparte; y lo que no haría nadie: golpes al aire, y quedarse lejos sin
// pelear.
export function valor(st) {
  return st.dado / 100 - st.recibido / 240 + st.duerme * 0.25 + (st.agarra || 0) * 0.15 + (st.trepana || 0) * 0.15 + (st.engancha || 0) * 0.05 - st.aire * 0.08 - (st.lejos || 0) * 0.02;
}

// ------------------------------------------------------------ a mano
if (typeof process !== 'undefined' && process.argv && import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs');
  const quien = process.argv[2] || 'todos';
  const n = +(process.argv[3] || 20);
  const modo = process.argv[4] || 'red';
  const vida = +(process.argv[5] || 1);
  let red = null;
  if (modo !== 'manual') {
    const f = new URL('../src/game/fisico_red.json', import.meta.url);
    if (fs.existsSync(f)) red = new Red(JSON.parse(fs.readFileSync(f, 'utf8')));
    else console.log('(sin red: la manera hecha a mano)');
  }
  const nombres = quien === 'todos' ? Object.keys(ESTILOS) : quien.split(',');
  const t0 = Date.now();
  const tot = { v: 0, n: 0 };
  for (const nombre of nombres) {
    const acc = { dado: 0, recibido: 0, muertes: 0, aire: 0, duerme: 0, t: 0, v: 0, vencido: 0, amagos: 0, retenidos: 0, ops: new Array(N_OUT).fill(0), jGolpes: 0, leDa: 0, jRuedas: 0, jDesvia: 0, desvios: 0, cubiertos: 0, curas: 0, agarra: 0, dSum: 0, lejosT: 0, est: {} };
    for (let i = 0; i < n; i++) {
      const s = pelea({ red, estilo: nombre, seed: 1000 + i * 7919, vida });
      acc.dado += s.dado;
      acc.recibido += s.recibido;
      acc.muertes += s.muertes;
      acc.aire += s.aire;
      acc.duerme += s.duerme;
      acc.t += s.t;
      acc.v += valor(s);
      acc.vencido += s.fin === 'vencido' ? 1 : 0;
      acc.amagos += s.amagos;
      acc.retenidos += s.retenidos;
      for (const k of ['jGolpes', 'leDa', 'jRuedas', 'jDesvia', 'desvios', 'cubiertos', 'curas', 'agarra', 'dSum', 'lejosT']) acc[k] += s[k];
      for (const k in s.est) acc.est[k] = (acc.est[k] || 0) + s.est[k];
      acc.dGolpe = acc.dGolpe || {};
      for (const k in s.dGolpe) acc.dGolpe[k] = (acc.dGolpe[k] || 0) + s.dGolpe[k];
      s.ops.forEach((v, k) => (acc.ops[k] += v));
    }
    const f = (v) => (v / n).toFixed(1);
    const top = acc.ops
      .map((v, k) => [OPCIONES[k], v])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `${k} ${Math.round((v / acc.ops.reduce((a, b) => a + b, 0)) * 100)}%`)
      .join(', ');
    if (process.env.JUGADOR) console.log(`${' '.repeat(11)}el jugador: golpes ${f(acc.jGolpes)} (entran ${f(acc.leDa)}) · volteretas ${f(acc.jRuedas)} · desvía ${f(acc.jDesvia)} (${f(acc.desvios)}) · guardia ${f(acc.cubiertos)} · bebe ${f(acc.curas)} · agarra ${f(acc.agarra)} · a ${(acc.dSum / acc.t).toFixed(2)} m de media · lejos ${Math.round((acc.lejosT / acc.t) * 100)} % · él: ${Object.entries(acc.est).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round((v / acc.t) * 100) + '%').join(' ')}`);
    if (process.env.JUGADOR) console.log(`${' '.repeat(11)}golpea desde: ${['<1.5', '1.5-2.2', '2.2-2.8', '2.8-3.5', '>3.5'].map((k) => k + ' m ' + f((acc.dGolpe || {})[k] || 0)).join(' · ')}`);
    console.log(`${nombre.padEnd(10)} valor ${f(acc.v).padStart(5)} · te quita ${f(acc.dado)} · le quitas ${f(acc.recibido)} · caes ${f(acc.muertes)} · al aire ${f(acc.aire)} · duerme ${f(acc.duerme)} · amagos ${f(acc.amagos)} · retenidos ${f(acc.retenidos)} · ${f(acc.t)} s · vencido ${acc.vencido}/${n} · ${top}`);
    tot.v += acc.v;
    tot.n += n;
  }
  console.log(`valor medio ${(tot.v / tot.n).toFixed(2)} · ${((Date.now() - t0) / tot.n).toFixed(1)} ms por pelea`);
}
