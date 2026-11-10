// A nado: el agua honda (la del Sumidero, su venero y la pila del ninfeo:
// world/sumidero.js, NADO). Aquí, lo que es del sitio: dónde hay agua que no
// se hace pie, cuándo se entra en ella (caminando, o cayendo desde la
// repisa), el aliento bajo el agua (y lo que pasa cuando se acaba), la vista
// y el oído bajo el agua, las burbujas, el chapoteo y los anillos que deja
// quien nada. Cómo nada el jugador (lo que se mueve, la brazada), en
// entities/nado.js.
import * as THREE from 'three';
import { NADO } from '../world/sumidero.js';
import { damp } from '../core/util.js';
import { nadoEntrar } from '../entities/nado.js';

// lo que aguanta la respiración (s), y lo que tarda en recuperarla
export const ALIENTO = 32;
// el agua que hace falta para no hacer pie (de la superficie al suelo)
export const HONDO = 1.35;
// los colores del agua de cada sitio, vista desde dentro
const COLOR = { lago: [0.004, 0.011, 0.014], venero: [0.006, 0.026, 0.02], tiro: [0.008, 0.03, 0.024], pila: [0.01, 0.03, 0.024] };

// (los estados desde los que uno se va al agua: no derribado, ni en una
// cinemática, ni descansando)
const ENTRA = new Set(['free', 'attack', 'roll', 'hurt', 'stagger', 'heal', 'blockhit', 'parry', 'getup', 'interact']);

export class Nado {
  constructor(g) {
    this.g = g;
    this.vols = NADO;
    this.aliento = ALIENTO;
    this.under = 0;
    this._c = new THREE.Color();
    this.burbT = 0;
    this.ahogoT = 0;
    this.hint = false;
  }

  // El agua que hay en (x, y, z), o null.
  agua(x, y, z) {
    for (const v of this.vols) if (y > v.y0 && y < v.y1 + 0.06 && v.en(x, z)) return v;
    return null;
  }
  // La superficie del agua en (x, z) a la altura y (con aire encima), o null.
  superficie(x, y, z) {
    const v = this.agua(x, y, z);
    return v && v.aire ? v.y1 : null;
  }

  // ¿Se va al agua? (lo mira el jugador después de moverse)
  entrada(p) {
    if (p.dead || p.state === 'swim' || !ENTRA.has(p.state) || p.puppet) return;
    const P = p.body.pos;
    const v = this.agua(P.x, P.y + 0.9, P.z);
    if (!v) return;
    if (v.aire) {
      const g = this.g.world.col.groundHeight(P.x, P.z, p.body.radius, P.y + 0.5);
      // (hace pie: se anda, despacio)
      if (v.y1 - g < HONDO && p.body.grounded) return;
      // (hasta el pecho)
      if (P.y + 1.0 > v.y1) return;
    }
    nadoEntrar(p, v);
  }

  // Cada fotograma: la vista bajo el agua, el aliento en la pantalla, las
  // burbujas y lo que se ahoga.
  update(dt) {
    const g = this.g;
    const p = g.player;
    const c = g.camera.position;
    const v = this.agua(c.x, c.y, c.z);
    const dentro = !!v && (!v.aire || c.y < v.y1 - 0.03) && g.state !== 'title';
    this.under = dentro ? 1 : damp(this.under, 0, 30, dt) < 0.02 ? 0 : damp(this.under, 0, 30, dt);
    const U = g.post.U;
    U.uUnder.value = this.under;
    // (bajo el agua, a los treinta metros ya no se ve nada: no se dibuja)
    g.atmo.farCap = this.under > 0.5 ? 34 : null;
    if (v) U.uUnderC.value.setRGB(...(COLOR[v.id] || COLOR.lago));
    g.audio && g.audio.setUnder && g.audio.setUnder(this.under);
    // (andando por el agua hasta la cintura, despacio: lo pone Cloacas antes)
    if (p.state !== 'swim' && !p.dead) {
      const P = p.body.pos;
      const s = this.superficie(P.x, P.y + 0.5, P.z);
      if (s !== null && s - P.y > 0.45) p.vadeo = Math.min(p.vadeo ?? 1, s - P.y > 0.85 ? 0.5 : 0.7);
    }
    // el aliento: se gasta bajo el agua; arriba vuelve
    const S = p.nadoS;
    const bajo = p.state === 'swim' && S && S.sub && !p.dead;
    if (bajo) this.aliento = Math.max(0, this.aliento - dt);
    else this.aliento = Math.min(ALIENTO, this.aliento + dt * 6);
    // (al acabarse, la vista se cierra; y el corazón se oye)
    const falta = bajo ? Math.max(0, 1 - this.aliento / (ALIENTO * 0.3)) : 0;
    U.uAhogo.value = falta * 0.9;
    if (falta > 0) {
      this.latT = (this.latT ?? 0) - dt;
      if (this.latT <= 0) {
        this.latT = 0.95 - falta * 0.45;
        g.audio && g.audio.play('heartbeat', null, { gain: 0.3 + falta * 0.5 });
      }
    }
    // (sin aliento: se ahoga)
    if (bajo && this.aliento <= 0) {
      this.ahogoT -= dt;
      if (!(g.dev && g.dev.god)) p.hp -= 14 * dt * (p.mods ? p.mods.taken : 1);
      if (this.ahogoT <= 0) {
        this.ahogoT = 1.1;
        g.hurtFlash = Math.max(g.hurtFlash || 0, 0.45);
        g.audio && g.audio.play('burbujas', p.pos, { gain: 0.8 });
        p.flinchX && p.flinchX.kick(-4);
      }
      if (p.hp <= 0) {
        p.hp = 0;
        p.die();
      }
    }
    // las burbujas de quien nada bajo el agua (más cuanto más le falta el aire)
    if (bajo) {
      this.burbT -= dt * (1 + (1 - this.aliento / ALIENTO) * 2.5);
      if (this.burbT <= 0) {
        this.burbT = 0.7 + Math.random() * 0.9;
        const h = p.rig.worldPos('head', this._h || (this._h = new THREE.Vector3()));
        g.fx.blood.emit(h.x, h.y + 0.1, h.z, 4 + Math.floor(Math.random() * 4), { color: [0.55, 0.7, 0.72], speed: 0.35, life: 2.2, up: 0.6, gravity: -1.6, stain: false });
        if (Math.random() < 0.5) g.audio && g.audio.play('burbujas', h, { gain: 0.3 });
      }
    }
    // la primera vez que se cae al agua honda: cómo se nada
    if (p.state === 'swim' && !this.hint && g.ui) {
      this.hint = true;
      if (!g.flags['nado:aviso']) {
        g.flags['nado:aviso'] = true;
        const pad = g.input.device === 'pad';
        g.ui.toast(pad ? 'A nado. B: zambullirse y bajar · A: subir · el stick, hacia donde miras.' : 'A nado. Espacio: zambullirse y bajar · E: subir · bajo el agua se nada hacia donde miras.', 7);
      }
    }
  }

  // El chapoteo de algo que cae o se mueve en la superficie (anillos,
  // gotas, el ruido).
  chapoteo(x, y, z, k = 1, sonido = 'brazada') {
    const g = this.g;
    g.waters && g.waters.ripple(x, z, Math.min(1.6, 0.5 + k * 0.6), y);
    if (k > 0.3) g.fx.blood.emit(x, y + 0.05, z, Math.round(6 + 14 * k), { color: [0.5, 0.58, 0.6], speed: 1.2 + k * 1.8, life: 0.8, up: 1.2 + k * 2, gravity: 12, stain: false });
    if (sonido) g.audio && g.audio.play(sonido, { x, y, z }, { k, gain: 0.3 + k * 0.3 });
  }
}
