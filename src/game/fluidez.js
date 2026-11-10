// Fluidez: que el juego vaya fluido también donde la tarjeta gráfica no da
// para tanto (portátiles sin gráfica, tabletas, teléfonos).
//
// Mira, mientras se juega, a cuántos fotogramas por segundo va y cuánto de
// cada fotograma se le va al procesador (la lógica y preparar el dibujo). Si
// va lento y no es por el procesador —lo que falta es tarjeta gráfica—, prueba
// un escalón menos de resolución interna (lo mismo que en Opciones, nunca por
// debajo de 360p) y se queda con él sólo si así va de verdad más fluido; si
// no mejora, vuelve a la de antes y no lo intenta más. Nada de esto toca el
// juego: ni la lógica, ni el paso del tiempo, ni lo que se ve, salvo el tamaño
// de los píxeles. Si el jugador elige la resolución a mano en Opciones, deja
// de tocarla (settings.resAuto).
export const RES_STEPS = [240, 300, 360, 480, 540, 720];
const MIN_RES = 360;
// (lento: por debajo de esto; y para quedarse con el escalón, al menos esta
// mejora)
const SLOW_FPS = 45;
const GAIN = 1.12;
const WIN = 2; // segundos de cada medida

export class Fluidez {
  constructor(game) {
    this.g = game;
    this.reset(6);
    // (con el navegador manejado por las pruebas automáticas —tools/—, nunca:
    // allí va lento a propósito, sin tarjeta gráfica, y sus fotos y medidas
    // tienen que salir a la resolución que piden)
    this.off = typeof navigator !== 'undefined' && !!navigator.webdriver;
    this.trial = null;
  }

  reset(cool = 3) {
    this.cool = cool;
    this.n = 0;
    this.t = 0;
    this.cpu = 0;
    this.slow = 0;
  }

  // Cada fotograma: dt, lo que ha pasado desde el anterior (s, sin recortar);
  // cpu, lo que han tardado update() y render() (s).
  frame(dt, cpu) {
    const g = this.g,
      S = g.settings;
    if (this.off || S.resAuto === false) return;
    // (sólo jugando: los menús, el título, la pestaña oculta o un salto largo
    // —se ha ido a otra ventana, se ha cargado una zona— no cuentan)
    if (g.state !== 'play' || g.ui.modal || document.hidden || dt > 0.25 || g.ffSteps > 1) {
      if (this.n) this.reset();
      return;
    }
    if (this.cool > 0) {
      this.cool -= dt;
      return;
    }
    this.n++;
    this.t += dt;
    this.cpu += cpu;
    if (this.t < WIN) return;
    const fps = this.n / this.t,
      cpuFrac = this.cpu / this.t;
    this.n = 0;
    this.t = 0;
    this.cpu = 0;
    if (this.trial) {
      // ¿ha servido el escalón de menos?
      const T = this.trial;
      this.trial = null;
      if (fps >= T.fps * GAIN) {
        S.resAuto = true;
        g.applySettings();
        g.ui.toast(`Resolución interna: ${S.res}p, para que vaya fluido (se puede cambiar en Opciones)`, 5);
        this.reset(4);
      } else {
        // no: la de antes, y no se vuelve a probar
        S.res = T.res;
        g.applySettings();
        this.off = true;
      }
      return;
    }
    // lento, y el procesador no va ahogado (lo que falta es tarjeta gráfica)
    if (fps < SLOW_FPS && cpuFrac < 0.6) this.slow++;
    else this.slow = 0;
    if (this.slow < 2) return;
    const i = RES_STEPS.indexOf(S.res);
    const lower = i > 0 ? RES_STEPS[i - 1] : null;
    if (!lower || lower < MIN_RES) {
      this.off = true;
      return;
    }
    this.trial = { res: S.res, fps };
    S.res = lower;
    g.applySettings();
    this.reset(3);
  }
}
