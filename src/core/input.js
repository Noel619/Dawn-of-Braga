// Entrada unificada: teclado + ratón y mando (API Gamepad, mapeo estándar
// = XInput). Expone acciones abstractas y detecta el último dispositivo usado
// para mostrar los iconos correctos en pantalla.

const KB = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  light: ['M0'],
  heavy: ['KeyF', 'M3', 'M4'],
  block: ['M2', 'KeyC'],
  dodge: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  lock: ['KeyQ', 'M1'],
  heal: ['KeyR'],
  interact: ['KeyE'],
  inventory: ['Tab', 'KeyI'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
  // menús
  confirm: ['Enter', 'KeyE', 'Space'],
  back: ['Escape', 'Backspace', 'Tab'],
  mUp: ['ArrowUp', 'KeyW'],
  mDown: ['ArrowDown', 'KeyS'],
  mLeft: ['ArrowLeft', 'KeyA'],
  mRight: ['ArrowRight', 'KeyD'],
  tabL: ['KeyQ'],
  tabR: ['KeyE'],
  camL: ['KeyJ'],
  camR: ['KeyL'],
  camU: [],
  camD: [],
};

// Índices del mapeo estándar W3C (idéntico a XInput)
const PAD = {
  interact: [0], // A
  confirm: [0],
  dodge: [1], // B
  back: [1],
  heal: [2], // X
  inventory: [3], // Y
  block: [4], // LB
  tabL: [4],
  light: [5], // RB
  tabR: [5],
  heavy: [7], // RT
  map: [8], // Back/View
  pause: [9], // Start/Menu
  lock: [11], // R3
  sprint: [10], // L3
  mUp: [12],
  mDown: [13],
  mLeft: [14],
  mRight: [15],
};

const DEAD = 0.18;

function deadzone(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEAD) return [0, 0];
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return [x * k, y * k];
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.kPressed = new Set();
    this.kReleased = new Set();
    this.mdx = 0;
    this.mdy = 0;
    this.device = 'kb';
    this.pad = null;
    this.padPrev = [];
    this.padNow = [];
    this.state = {}; // action -> {down, pressed, released, t}
    this.sens = 1;
    this.invertY = false;
    this.locked = false;
    this.enabledPointerLock = true;
    this.stickMenu = { x: 0, y: 0, t: 0 };
    this.onPointerLockLost = null;
    this.anyPressed = false;

    addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.keys.has(e.code)) this.kPressed.add(e.code);
      this.keys.add(e.code);
      this.device = 'kb';
      this.anyPressed = true;
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.kReleased.add(e.code);
    });
    addEventListener('blur', () => {
      for (const k of this.keys) this.kReleased.add(k);
      this.keys.clear();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousedown', (e) => {
      const c = 'M' + e.button;
      if (!this.keys.has(c)) this.kPressed.add(c);
      this.keys.add(c);
      this.device = 'kb';
      this.anyPressed = true;
    });
    addEventListener('mouseup', (e) => {
      const c = 'M' + e.button;
      this.keys.delete(c);
      this.kReleased.add(c);
    });
    // Chrome, con el ratón capturado, manda de vez en cuando un movimiento
    // espurio enorme en un solo evento (un salto de media pantalla, a veces
    // con el signo cambiado): la cámara daba media vuelta de golpe al
    // girarla. Un giro de verdad, por rápido que sea, se reparte en varios
    // eventos seguidos en la misma dirección; un salto aislado, no. Así que
    // un evento desmesurado para lo que se venía moviendo queda en espera:
    // si el siguiente sigue en la misma dirección y con fuerza, era un giro
    // rápido y cuentan los dos; si no, se descarta.
    this._mAvg = 0;
    this._mPend = null;
    this._lockAt = -1e9;
    this.spikes = 0;
    addEventListener('mousemove', (e) => {
      // Sin pointer lock (p.ej. en un iframe restringido) se sigue usando movementX
      if (!(this.locked || this.freeLook)) return;
      const dx = e.movementX || 0,
        dy = e.movementY || 0;
      const now = performance.now();
      // (el primer evento tras capturar el ratón trae a veces el salto del cursor al centro)
      if (now - this._lockAt < 90) return;
      const m = Math.abs(dx) + Math.abs(dy);
      const lim = 160 + this._mAvg * 5;
      const P = this._mPend;
      if (P) {
        this._mPend = null;
        const same = Math.abs(P.dx) >= Math.abs(P.dy) ? Math.sign(dx) === Math.sign(P.dx) && Math.abs(dx) > Math.abs(P.dx) * 0.25 : Math.sign(dy) === Math.sign(P.dy) && Math.abs(dy) > Math.abs(P.dy) * 0.25;
        if (same && m > 30 && now - P.t < 70) {
          this._look(P.dx, P.dy, P.m);
          this._look(dx, dy, m);
          return;
        }
        this.spikes++;
      }
      if (m > lim) {
        this._mPend = { dx, dy, m, t: now };
        return;
      }
      this._look(dx, dy, m);
    });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) {
        this.freeLook = false;
        this._lockAt = performance.now();
        this._mPend = null;
        this._mAvg = 0;
      }
      if (was && !this.locked && this.onPointerLockLost) this.onPointerLockLost();
    });
    addEventListener('gamepadconnected', () => {
      this.device = 'pad';
    });
  }

  // Movimiento del ratón ya filtrado.
  _look(dx, dy, m) {
    this._mAvg = this._mAvg * 0.8 + Math.min(m, 400) * 0.2;
    this.mdx += dx;
    this.mdy += dy;
    if (m > 2) this.device = 'kb';
  }

  requestLock() {
    if (!this.enabledPointerLock || this.locked) return;
    const c = this.canvas;
    if (!c.requestPointerLock) return;
    const plain = () => {
      try {
        const p = c.requestPointerLock();
        if (p && p.catch) p.catch(() => (this.freeLook = !this.locked));
      } catch (e) {
        this.freeLook = true;
      }
    };
    // movimiento en crudo (sin la aceleración del sistema): en Windows evita
    // casi todos los saltos espurios de Chrome; donde no se admite, el normal
    if (this.rawMouse !== false) {
      try {
        const p = c.requestPointerLock({ unadjustedMovement: true });
        if (p && p.catch)
          p.catch((err) => {
            if (err && err.name === 'NotSupportedError') {
              this.rawMouse = false;
              plain();
            } else this.freeLook = !this.locked;
          });
        return;
      } catch (e) {
        this.rawMouse = false;
      }
    }
    plain();
  }
  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _pollPad() {
    let pads = [];
    try {
      pads = navigator.getGamepads ? navigator.getGamepads() : [];
    } catch (e) {
      pads = [];
    }
    let pad = null;
    for (const p of pads) if (p && p.connected) {
      pad = p;
      break;
    }
    this.pad = pad;
    this.padPrev = this.padNow;
    this.padNow = [];
    if (!pad) {
      // sin mando, sin sticks (al desconectarlo con uno inclinado, el
      // personaje seguía andando y la cámara girando solos)
      this.ls = this.rs = null;
      return;
    }
    for (let i = 0; i < pad.buttons.length; i++) {
      const b = pad.buttons[i];
      const v = typeof b === 'object' ? (b.pressed || b.value > 0.45 ? 1 : 0) : b > 0.45 ? 1 : 0;
      this.padNow[i] = v;
      if (v && !this.padPrev[i]) {
        this.device = 'pad';
        this.anyPressed = true;
      }
    }
    const [lx, ly] = deadzone(pad.axes[0] || 0, pad.axes[1] || 0);
    const [rx, ry] = deadzone(pad.axes[2] || 0, pad.axes[3] || 0);
    this.ls = { x: lx, y: ly };
    this.rs = { x: rx, y: ry };
    if (Math.abs(lx) + Math.abs(ly) + Math.abs(rx) + Math.abs(ry) > 0.3) this.device = 'pad';
  }

  // Llamar al principio de cada fotograma.
  update(dt) {
    this._pollPad();
    // acumulador del movimiento horizontal del ratón (para cambiar de objetivo)
    this.flickAcc = (this.flickAcc || 0) * Math.exp(-dt * 7) + this.mdx;
    for (const a of new Set([...Object.keys(KB), ...Object.keys(PAD)])) {
      let down = false,
        pressed = false,
        released = false;
      for (const k of KB[a] || []) {
        if (this.keys.has(k)) down = true;
        if (this.kPressed.has(k)) pressed = true;
        if (this.kReleased.has(k)) released = true;
      }
      for (const i of PAD[a] || []) {
        if (this.padNow[i]) down = true;
        if (this.padNow[i] && !this.padPrev[i]) pressed = true;
        if (!this.padNow[i] && this.padPrev[i]) released = true;
      }
      let s = this.state[a];
      if (!s) s = this.state[a] = { down: false, pressed: false, released: false, t: 0 };
      s.pressed = pressed;
      s.released = released;
      s.down = down;
      s.t = down ? s.t + dt : 0;
    }
    // stick izquierdo -> navegación en menús (con repetición)
    const sm = this.stickMenu;
    const ly = this.ls ? this.ls.y : 0,
      lx = this.ls ? this.ls.x : 0;
    const dirY = ly < -0.6 ? -1 : ly > 0.6 ? 1 : 0;
    const dirX = lx < -0.6 ? -1 : lx > 0.6 ? 1 : 0;
    sm.fire = null;
    if (dirY || dirX) {
      if ((dirY !== sm.y || dirX !== sm.x) || sm.t <= 0) {
        sm.fire = { x: dirX, y: dirY };
        sm.t = sm.y === dirY && sm.x === dirX ? 0.14 : 0.35;
      }
      sm.t -= dt;
    } else sm.t = 0;
    sm.x = dirX;
    sm.y = dirY;
  }

  endFrame() {
    this.kPressed.clear();
    this.kReleased.clear();
    this.mdx = 0;
    this.mdy = 0;
    this.anyPressed = false;
  }

  down(a) {
    return !!(this.state[a] && this.state[a].down);
  }
  pressed(a) {
    return !!(this.state[a] && this.state[a].pressed);
  }
  released(a) {
    return !!(this.state[a] && this.state[a].released);
  }
  held(a) {
    return this.state[a] ? this.state[a].t : 0;
  }

  // Navegación de menú combinando teclas, cruceta y stick.
  menuDir() {
    let x = 0,
      y = 0;
    if (this.pressed('mUp')) y = -1;
    if (this.pressed('mDown')) y = 1;
    if (this.pressed('mLeft')) x = -1;
    if (this.pressed('mRight')) x = 1;
    if (this.stickMenu.fire) {
      x = x || this.stickMenu.fire.x;
      y = y || this.stickMenu.fire.y;
    }
    return { x, y };
  }

  // Vector de movimiento (x derecha, y adelante), magnitud 0..1
  move() {
    let x = 0,
      y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y += 1;
    if (this.down('down')) y -= 1;
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    if (this.ls && (Math.abs(this.ls.x) > 0 || Math.abs(this.ls.y) > 0)) {
      x = this.ls.x;
      y = -this.ls.y;
    }
    return { x, y };
  }

  // Giro de cámara en radianes para este fotograma.
  look(dt) {
    let x = this.mdx * 0.0024 * this.sens,
      y = this.mdy * 0.0024 * this.sens;
    if (this.down('camL')) x -= 2.2 * dt * this.sens;
    if (this.down('camR')) x += 2.2 * dt * this.sens;
    if (this.down('camU')) y -= 1.6 * dt * this.sens;
    if (this.down('camD')) y += 1.6 * dt * this.sens;
    if (this.rs) {
      // curva de respuesta para precisión
      const cx = Math.sign(this.rs.x) * Math.pow(Math.abs(this.rs.x), 1.6);
      const cy = Math.sign(this.rs.y) * Math.pow(Math.abs(this.rs.y), 1.6);
      x += cx * 3.0 * dt * this.sens;
      y += cy * 2.0 * dt * this.sens;
    }
    if (this.invertY) y = -y;
    return { x, y };
  }

  // Impulso rápido del stick derecho / ratón para cambiar de objetivo fijado.
  flick() {
    if (this.rs && Math.abs(this.rs.x) > 0.75) return Math.sign(this.rs.x);
    // (un golpe de ratón decidido: con 70 px bastaba un leve reajuste del
    // pulso en mitad de una pelea para saltar a otra criatura y que la
    // cámara barriese hacia ella)
    if (Math.abs(this.flickAcc || 0) > 150 / Math.max(0.4, this.sens)) {
      const s = Math.sign(this.flickAcc);
      this.flickAcc = 0;
      return s;
    }
    return 0;
  }

  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    const p = this.pad;
    if (!p || !p.vibrationActuator) return;
    try {
      p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
    } catch (e) {
      /* sin vibración */
    }
  }
}

// Etiquetas de botón para indicaciones en pantalla.
export const GLYPHS = {
  kb: {
    interact: 'E',
    light: 'Clic izq.',
    heavy: 'F',
    block: 'Clic der.',
    dodge: 'Espacio',
    lock: 'Q',
    heal: 'R',
    inventory: 'Tab',
    map: 'M',
    pause: 'Esc',
    confirm: 'E',
    back: 'Esc',
    sprint: 'Mayús',
    tabL: 'Q',
    tabR: 'E',
  },
  pad: {
    interact: 'A',
    light: 'RB',
    heavy: 'RT',
    block: 'LB',
    dodge: 'B',
    lock: 'R3',
    heal: 'X',
    inventory: 'Y',
    map: 'View',
    pause: 'Start',
    confirm: 'A',
    back: 'B',
    sprint: 'B (mant.)',
    tabL: 'LB',
    tabR: 'RB',
  },
};
