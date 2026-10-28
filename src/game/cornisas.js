// Las cornisas y las vigas por las que se anda haciendo equilibrio: las del
// barrio de los Pellejeros (la viga del balcón de la viuda, la hilera que
// cayó sobre la calleja). Las mismas cuentas que el tablón del Soto (ver
// game/souto.js), para cualquier tramo recto de a a b y de ancho w
// (L.ledges): mientras se está en él, se anda despacio a lo largo, el cuerpo
// se va solo hacia un lado y hay que echarse hacia el otro; si se pasa,
// se cae (y lo que duela, lo dice la caída: Game.playerLanded).
import { MSG } from './story.js';
import { clamp } from '../core/util.js';

// lo que se tuerce solo, el freno, lo que corrige el jugador, lo que le
// zarandea la viga y la velocidad sobre ella (como en el tablón)
const B_UNST = 3.0,
  B_DAMP = 1.8,
  B_PUSH = 5.5,
  B_NOISE = 1.05,
  B_SPEED = 0.95;

export class Cornisas {
  constructor(g) {
    this.g = g;
    this.list = (g.level.L.ledges || []).map((l) => {
      const dx = l.b[0] - l.a[0],
        dz = l.b[2] - l.a[2];
      const len = Math.hypot(dx, dz);
      return { ...l, ax: dx / len, az: dz / len, len };
    });
    this.cur = null;
    this.ph = 0;
    this.creakT = 0;
  }

  // El tramo en el que está el jugador, si está en alguno (y por dónde va).
  find(p) {
    for (const l of this.list) {
      const rx = p.pos.x - l.a[0],
        rz = p.pos.z - l.a[2];
      const u = rx * l.ax + rz * l.az;
      if (u < 0 || u > l.len) continue;
      const off = rx * l.az - rz * l.ax;
      if (Math.abs(off) > l.w / 2 + 0.1) continue;
      const t = u / l.len;
      const y = l.a[1] + (l.b[1] - l.a[1]) * t;
      if (Math.abs(p.pos.y - y) > 0.3) continue;
      return { l, t };
    }
    return null;
  }

  start(p, l) {
    const g = this.g;
    // (lean > 0: hacia la derecha del tramo, de a a b)
    p.balance = { src: 'cornisa', ax: l.ax, az: l.az, cx: l.a[0], cz: l.a[2], lean: (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.05), vel: 0, input: 0 };
    p.state = 'free';
    p.buffer = null;
    this.cur = l;
    this.ph = Math.random() * 10;
    this.creakT = 0.3;
    if (!g.hintsShown.balanceViga) {
      g.hintsShown.balanceViga = true;
      g.say(MSG.equilibrioViga);
    }
  }

  end(p) {
    if (p.balance && p.balance.src === 'cornisa') p.balance = null;
    this.cur = null;
  }

  update(dt) {
    const g = this.g;
    const p = g.player;
    if (!this.list.length) return;
    const hit = !p.dead && p.body.grounded && p.state === 'free' ? this.find(p) : null;
    if (hit && !p.balance) this.start(p, hit.l);
    else if (!hit && p.balance && p.balance.src === 'cornisa') this.end(p);
    const b = p.balance;
    if (!b || b.src !== 'cornisa' || !hit) return;
    const t = g.time;
    const sp = Math.hypot(p.vx, p.vz);
    const walk = clamp(sp / B_SPEED, 0, 1);
    // cimbrea más en medio del tramo que en las puntas
    const mid = 1 - Math.abs(hit.t - 0.5) * 2;
    const n = Math.sin(t * 1.9 + this.ph) * 0.6 + Math.sin(t * 0.83 + this.ph * 2.3) * 0.5 + Math.sin(t * 3.7 + this.ph) * 0.2;
    const acc = B_UNST * b.lean + n * B_NOISE * (0.35 + 0.65 * walk) * (0.6 + 0.4 * clamp(mid, 0, 1)) - B_DAMP * b.vel + B_PUSH * b.input;
    b.vel += acc * dt;
    b.lean += b.vel * dt;
    // (la que va pegada a una pared: hacia ella no se cae, se apoya uno en el
    // muro y rebota)
    const wl = hit.l.wall;
    if (wl && Math.sign(b.lean) === wl && Math.abs(b.lean) > 0.62) {
      b.lean = 0.62 * wl;
      if (b.vel * wl > 0) {
        if (b.vel * wl > 0.5) g.audio && g.audio.play('land', { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, { v: 3 });
        b.vel = -b.vel * 0.35;
      }
    }
    this.creakT -= dt * (0.6 + walk + Math.abs(b.lean) * 1.5);
    if (this.creakT <= 0) {
      this.creakT = 0.9 + Math.random() * 0.8;
      g.audio && g.audio.play('stairCreak', { x: p.pos.x, y: p.pos.y, z: p.pos.z });
    }
    if (Math.abs(b.lean) >= 1) this.fall(p, Math.sign(b.lean), hit.l);
  }

  // Se pasa de inclinarse: trastabilla hacia ese lado y cae.
  fall(p, s, l) {
    const g = this.g;
    this.end(p);
    p.state = 'stagger';
    p.stT = 0;
    p.anim.play(p.clips.stagger, { blend: 0.06 });
    // (hacia la derecha del tramo: (az, -ax))
    const nx = l.az * s,
      nz = -l.ax * s;
    p.pos.x += nx * (l.w / 2 + 0.25);
    p.pos.z += nz * (l.w / 2 + 0.25);
    p.vx = nx * 3.2;
    p.vz = nz * 3.2;
    g.ui.toast(MSG.caida, 2.5);
    g.audio && g.audio.play('stairCreak', { x: p.pos.x, y: p.pos.y, z: p.pos.z });
  }

  reset() {
    this.end(this.g.player);
  }
  onRespawn() {
    this.end(this.g.player);
  }
}
