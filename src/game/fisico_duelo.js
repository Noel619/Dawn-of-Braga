// El duelo de la cisterna (game/fisico_rama.js): el Físico, cambiado, baja
// de su pretil a pelear con los suyos.
//
// Pelea con la misma cabeza que en su sala (fisico_mente.js: la red entrenada,
// con reflejos de persona) y con su historia clínica de ti, que ha seguido
// apuntando mientras le mirabas pelear con ellos desde arriba. Con lo que es
// ahora: la hoja de amputar en lugar de la mano izquierda (los golpes del
// hierro, con ella: los tres tajos, la lanceta, la estocada a fondo; para su
// cabeza, el segundo tiempo de su aforismo) y, en la derecha, la campanilla
// de las órdenes. Y piensa por los suyos:
//   - si uno de ellos te tiene sujeto, va a por ti y te remata (como al otro:
//     la hoja, a fondo);
//   - las órdenes, cuando le convienen: si estás con uno de los suyos y él
//     lejos, dos toques (que te sujeten); si estás con él, uno (que te cerquen:
//     sin sitio para rodar); si bebes o te quedas sin aliento, tres; y nunca
//     con tu espada encima (tocar le deja al descubierto).
//
// Y duda. Su tratado (De peste sanorum) dice que la enfermedad es querer: la
// piedra de querer, la que hace que uno espere; que los que se arrodillaron
// la noche de la campana se curaron, quietos como los árboles. Aquí abajo
// todo quiere algo (la higuera busca el agujero, las raíces el agua, las
// flores se abren a la luna) y está sano; y los suyos, sus curados, no
// quieren nada y tampoco crecen. Cada duda la dice; las más hondas le paran
// un momento a mirar la luz (si no tiene tu espada encima). Luego se rehace
// («El tratamiento no se interrumpe») y pelea más fuerte, para no oírse.
import { PeleaFisico, DUREZA } from './fisico_pelea.js';
import { DIALOG } from './story.js';
import { CLOACA } from '../world/cloaca.js';
import { damp, dampAngle } from '../core/util.js';
import { ALIENTO } from './fisico_mente.js';

const SALA = CLOACA.sala;
// donde cae la luna, en la isla: donde él estaba siempre
export const LUZ = { x: CLOACA.desfigurado.x, z: CLOACA.desfigurado.z };
// los golpes de su cabeza, con la hoja (los del hierro: la sierra, la lanceta
// y el trépano, que aquí es la estocada a fondo); amaga con la lanceta
const HOJA = { sierra: 'hojaTajos', lanceta: 'hojaLanceta', trepano: 'hojaEstocada' };
// lo que se dice, por orden, y cuándo: lo que ve (lejos de la luz o cerca), lo
// que le pasa (su vida), lo que les pasa a los suyos. mira: le para a mirar
// la luz (s); tras: dicho a los tantos segundos del anterior
const DUDAS = [
  { cuando: (D) => D.cercaLuz || D.t > 18 },
  { cuando: (D) => D.k < 0.86, mira: 1.4 },
  { tras: 3.4 },
  { cuando: (D) => D.k < 0.7, mira: 1.3 },
  { cuando: (D) => (D.vivos === 0 && D.muertos > 0) || D.k < 0.55 },
  { cuando: (D) => D.k < 0.45, mira: 1.9 },
  { tras: 3.0, rehace: true },
  { cuando: (D) => D.k < 0.2 },
];

export class DueloFisico extends PeleaFisico {
  constructor(g, F, R) {
    super(g, F);
    this.R = R;
    this.dudas = 0;
  }
  // (la sala de la luz: lo que hay hasta su pared)
  pared(x, z, ux, uz) {
    let t = 99;
    if (ux > 1e-6) t = Math.min(t, (SALA.x1 - x) / ux);
    if (ux < -1e-6) t = Math.min(t, (SALA.x0 - x) / ux);
    if (uz > 1e-6) t = Math.min(t, (SALA.z1 - z) / uz);
    if (uz < -1e-6) t = Math.min(t, (SALA.z0 - z) / uz);
    return Math.max(0, t);
  }
  golpeDe(k) {
    return HOJA[k] || null;
  }
  amagaDe() {
    return 'hojaLanceta';
  }
  coronados() {
    return this.R.vivos().length;
  }
  // Empieza (al llegar abajo): una consulta nueva.
  empiezaDuelo() {
    const g = this.g;
    const e = this.e;
    this.reset();
    e.data.fase = 2;
    e.data.zurdo = true;
    e.data.aliento = ALIENTO.max;
    e.data.lookUp = false;
    e.D.engaged = true;
    this.F.H.encuentro('pelea');
    this.mente.reaccion = DUREZA.reaccion;
    this.mente.temp = DUREZA.temp;
    this.t0 = g.time;
    this.dudas = 0;
    this.dudaT = g.time;
    this.mira = 0;
    this.miraEspera = 0;
    this.tocaHasta = 0;
    this.ordenT = g.time + 5;
    this.muertos = 0;
    this.luego(4.5, () => this.diceApunta());
  }
  // ------------------------------------------------------------ lo que piensa
  think(e, pl, d, dt) {
    if (e.state === 'guion') return 'handled';
    const g = this.g;
    // mirando la luz (la duda), o tocando la campanilla: quieto
    if (this.mira > 0 || g.time < this.tocaHasta) {
      e.vx = damp(e.vx, 0, 8, dt);
      e.vz = damp(e.vz, 0, 8, dt);
      const tx = this.mira > 0 ? LUZ.x : pl.pos.x,
        tz = this.mira > 0 ? LUZ.z : pl.pos.z;
      e.yaw = dampAngle(e.yaw, Math.atan2(tx - e.pos.x, tz - e.pos.z), 4, dt);
      return 'handled';
    }
    // si uno de los suyos te tiene sujeto: a rematarte
    if (pl.state === 'grabbed' && this.R.teSujetan()) {
      if (d < 2.5 && e.cooldown <= 0.25 && this.puede(e, 'hojaEstoque', d)) {
        this.golpe(e, 'hojaEstoque');
        return 'handled';
      }
      e.chaseTo(pl.pos.x, pl.pos.z, e.T.run, dt, pl.pos.y);
      return 'handled';
    }
    // las órdenes, cuando le convienen (y con sitio)
    if (this.ordena(e, pl, d)) return 'handled';
    return this.tactica(e, pl, d, dt);
  }
  // Las órdenes de la campanilla en el duelo: si le convienen, y con tu
  // espada lejos. Devuelve si toca.
  ordena(e, pl, d) {
    const g = this.g;
    if (g.time < this.ordenT || e.cooldown > 0 || d < 3.2) return false;
    const vivos = this.R.vivos();
    if (!vivos.length) return false;
    const conUno = vivos.some((c) => c.distTo(pl.pos) < 2.6);
    let k = null;
    if (pl.state === 'heal' || pl.st < pl.maxSt * 0.25) k = 'carga';
    else if (conUno && d > 4.5) k = 'sujeta';
    else if (d < 6.5 && vivos.length >= 2) k = 'cerco';
    else if (vivos.length === 1 || Math.random() < 0.5) k = 'carga';
    if (!k) {
      this.ordenT = g.time + 2;
      return false;
    }
    this.R.ordena(k, vivos);
    this.ordenT = g.time + 7 + Math.random() * 3;
    this.tocaHasta = g.time + 1.2;
    e.cooldown = Math.max(e.cooldown, 1.2);
    return true;
  }
  // ------------------------------------------------------------ las dudas
  // (cada fotograma, desde la rama: lo que ve y lo que le pasa, dicho)
  duda(dt) {
    const g = this.g;
    const e = this.e;
    const p = g.player;
    if (this.mira > 0) {
      this.mira -= dt;
      e.data.lookUp = this.mira > 0;
    }
    const n = this.dudas;
    if (n >= DUDAS.length) return;
    const Q = DUDAS[n];
    const D = {
      t: g.time - this.t0,
      k: e.hp / e.maxHp,
      cercaLuz: Math.hypot(e.pos.x - LUZ.x, e.pos.z - LUZ.z) < 5,
      vivos: this.R.vivos().length,
      muertos: this.R.muertos(),
    };
    const listo = Q.tras ? g.time - this.dudaT >= Q.tras : Q.cuando(D) && g.time - this.dudaT > 5;
    if (!listo || e.state === 'attack') return;
    // (lo que le para a mirar: no con tu espada encima; si no, al rato, lo
    // dice sin pararse)
    let mira = Q.mira || 0;
    if (mira && e.distTo(p.pos) < 2.6) {
      this.miraEspera += dt;
      if (this.miraEspera < 6) return;
      mira = 0;
    }
    this.miraEspera = 0;
    this.dudas++;
    this.dudaT = g.time;
    this.F.say(DIALOG.fisicoRamaDuda[n], mira ? Math.max(2.6, mira + 1.2) : 3.2);
    if (mira) {
      this.mira = mira;
      e.data.lookUp = true;
    }
    // («el tratamiento no se interrumpe»: se rehace, y pelea más fuerte)
    if (Q.rehace) {
      this.mente.reaccion = DUREZA.reaccion * 0.85;
      this.mente.temp = DUREZA.temp * 0.7;
      // (y su música, la del hierro)
      g.audio && g.audio.music('bossFisico2');
    }
  }
  // (sin tiempos que guarden su vida: lo que le das, le quita)
  preHit() {
    return null;
  }
}
