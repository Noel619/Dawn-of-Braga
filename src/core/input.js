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
    addEventListener('mousemove', (e) => {
      // Sin pointer lock (p.ej. en un iframe restringido) se sigue usando movementX
      if (this.locked || this.freeLook) {
        this.mdx += e.movementX || 0;
        this.mdy += e.movementY || 0;
        if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.device = 'kb';
      }
    });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked && this.onPointerLockLost) this.onPointerLockLost();
    });
    addEventListener('gamepadconnected', () => {
      this.device = 'pad';
    });
  }

  requestLock() {
    if (!this.enabledPointerLock || this.locked) return;
    try {
      const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => (this.freeLook = true));
    } catch (e) {
      this.freeLook = true;
    }
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
    if (!pad) return;
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
    if (this.rs && Math.abs(this.rs.x) > 0.8) return Math.sign(this.rs.x);
    if (Math.abs(this.mdx) > 60) return Math.sign(this.mdx);
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
