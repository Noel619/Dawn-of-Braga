// La lobera y su dueño (world/cloacas_hondas.js, entities/lobishome.js).
//
// La luz es del jugador y la oscuridad es suya. Se pelea por el terreno:
//  - el mapa de luz (luzEn): el farol del jugador (unos cuatro metros y
//    medio alrededor, menos cuando tiembla), los braseros encendidos (seis
//    y medio cada uno) y la luna que baja por el pozo de las ánimas;
//  - los braseros de los cruces, apagados al entrar: se encienden con el
//    farol (un segundo largo, en el que se está a su merced); él los vuelca
//    de un zarpazo y el aullido los apaga a su alrededor (en la tercera fase,
//    todos), y hace temblar el farol;
//  - en lo oscuro sólo se le ven los ojos (el cuerpo se apaga); en la luz,
//    entero; un golpe en la luz lo deslumbra (entities/lobishome.js);
//  - los escondites: los cruces a oscuras a unos metros de ti, por las
//    galerías (el grafo de la red: world/cloaca_kit.js);
//  - la luna del pozo: en la tercera fase, si la pisa, se queda mirándola.
// Al caer el jugador (o al descansar), los braseros se apagan y él vuelve a
// su sitio.
import * as THREE from 'three';
import { MSG } from './story.js';
import { HONDAS } from '../world/cloacas_hondas.js';

const R_FAROL = 4.6;
const R_BRASERO = 6.5;
const _v = new THREE.Vector3();

export class Lobo {
  constructor(g) {
    this.g = g;
    const L = g.level.L;
    this.braseros = (L.braseros || []).map((b) => ({ ...b, lit: false, it: g.interact.list.find((i) => i.id === 'ib_' + b.id) || null }));
    // el grafo de la lobera (los cruces, las bocas y las salas a su altura)
    const red = (g.level.ctx.redes || []).find((r) => r.N && r.N[HONDAS.entrada]);
    this.grafo = red ? red.grafo : {};
    const y = HONDAS.y.n1;
    this.nodos = Object.values(this.grafo).filter((n) => Math.abs(n.y - y) < 0.3);
    const Pz = HONDAS.pozo;
    this.luna = { x: (Pz.xs[1] + Pz.xs[2]) / 2, z: (Pz.zs[1] + Pz.zs[2]) / 2, r: 2.0 };
    this.pend = [];
    this.temblor = 0;
    this.farolK = 1;
    this.activo = false;
    this.apagarTodos(false);
  }

  // ------------------------------------------------------------ la luz
  luzEn(x, y, z) {
    const g = this.g;
    const p = g.player;
    let l = 0;
    if (p && !p.dead) {
      const r = R_FAROL * this.farolK;
      const d = Math.hypot(p.pos.x - x, p.pos.z - z) + Math.abs(p.pos.y - y) * 0.5;
      if (d < r) l = Math.max(l, 1 - d / r);
    }
    for (const b of this.braseros) {
      if (!b.lit) continue;
      const d = Math.hypot(b.x - x, b.z - z) + Math.abs(b.y - y) * 0.5;
      if (d < R_BRASERO) l = Math.max(l, 1 - d / R_BRASERO);
    }
    if (this.enLuna(x, z) && Math.abs(y - HONDAS.y.n1) < 1.5) l = Math.max(l, 0.85);
    return l;
  }
  enLuna(x, z) {
    return Math.hypot(x - this.luna.x, z - this.luna.z) < this.luna.r;
  }

  // ------------------------------------------------------------ el grafo
  nodoCerca(x, y, z) {
    let best = null,
      bd = 1e9;
    for (const n of this.nodos) {
      const d = Math.hypot(n.x - x, n.z - z) + Math.abs(n.y - y) * 2;
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }
  dijkstra(desde) {
    const dist = new Map([[desde.id, 0]]);
    const open = [desde];
    const enN1 = new Set(this.nodos.map((n) => n.id));
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist.get(open[i].id) < dist.get(open[bi].id)) bi = i;
      const n = open.splice(bi, 1)[0];
      const dn = dist.get(n.id);
      for (const a of n.ady) {
        if (!enN1.has(a.to)) continue;
        const nd = dn + a.d;
        if (nd < (dist.get(a.to) ?? Infinity)) {
          dist.set(a.to, nd);
          open.push(this.grafo[a.to]);
        }
      }
    }
    return dist;
  }
  // Un cruce a oscuras, a unos metros de ti por las galerías (y no donde
  // estás tú, ni tan cerca que te lo encuentres)
  escondite(e, player, [dmin, dmax]) {
    const pn = this.nodoCerca(player.pos.x, player.pos.y, player.pos.z);
    if (!pn) return null;
    const dist = this.dijkstra(pn);
    const cand = [];
    for (const n of this.nodos) {
      const d = dist.get(n.id);
      if (d === undefined || d < dmin || d > dmax) continue;
      if (n.k === 'sala') continue;
      if (Math.hypot(n.x - player.pos.x, n.z - player.pos.z) < 5) continue;
      if (this.luzEn(n.x, n.y, n.z) > 0.12) continue;
      // (mejor lo que le pilla de camino, y no siempre el mismo)
      const de = Math.hypot(n.x - e.pos.x, n.z - e.pos.z);
      cand.push([de * 0.4 + Math.random() * 6, n]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    return cand.length ? cand[Math.floor(Math.random() * Math.min(3, cand.length))][1] : null;
  }

  // ------------------------------------------------------------ los braseros
  setBrasero(b, on) {
    b.lit = on;
    this.g.setGroupVisible('brasero:' + b.id, on);
    if (b.it) b.it.hidden = on;
  }
  apagarTodos(fx = true) {
    for (const b of this.braseros) if (b.lit || !fx) this.apagarB(b, fx && b.lit);
  }
  apagarB(b, fx) {
    this.setBrasero(b, false);
    if (!fx) return;
    const g = this.g;
    g.fx && g.fx.blood && g.fx.blood.emit(b.x, b.y + 1.1, b.z, 18, { color: [0.24, 0.22, 0.2], speed: 1.2, life: 1.8, up: 1.6, gravity: -0.4 });
    g.audio && g.audio.play('candleOut', { x: b.x, y: b.y + 1, z: b.z });
  }
  apagar(id, volcado = false) {
    const b = this.braseros.find((q) => q.id === id);
    if (!b || !b.lit) return;
    this.apagarB(b, true);
    if (volcado && this.g.fx && this.g.fx.blood) this.g.fx.blood.emit(b.x, b.y + 0.9, b.z, 30, { color: [1, 0.5, 0.15], speed: 3, life: 0.9, up: 1.2, gravity: -6 });
    if (volcado) this.g.audio && this.g.audio.play('clang', { x: b.x, y: b.y + 0.8, z: b.z }, { k: 0.6 });
  }
  braseroCerca(x, z, r) {
    let best = null,
      bd = r;
    for (const b of this.braseros) {
      if (!b.lit) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
  // El jugador enciende uno con su farol: un segundo largo, a su merced.
  encender(it) {
    const g = this.g;
    const b = this.braseros.find((q) => q.id === it.brasero);
    if (!b || b.lit) return;
    const p = g.player;
    p.playInteract('interact', Math.atan2(b.x - p.pos.x, b.z - p.pos.z), 1.25);
    this.pend.push({ t: 0.9, fn: () => {
      if (p.dead || p.state !== 'interact') return;
      this.setBrasero(b, true);
      g.audio && g.audio.play('fireWhoosh', { x: b.x, y: b.y + 1, z: b.z });
      g.audio && g.audio.play('candleLit', { x: b.x, y: b.y + 1, z: b.z });
      if (!g.flags['lobo:brasero']) {
        g.flags['lobo:brasero'] = true;
        g.ui && g.ui.toast(MSG.braseroEnciende, 4);
      }
    } });
  }

  // ------------------------------------------------------------ la pelea
  empieza(e) {
    this.activo = true;
    this.farolK = 1;
  }
  // El aullido: apaga los braseros a su alrededor (en la tercera fase, todos),
  // el farol tiembla y se encoge, y de cerca deja sin aliento.
  aullido(e) {
    const g = this.g;
    e.data.aullidoCool = 16 + Math.random() * 6;
    g.audio && g.audio.play('aullido', e.pos);
    g.camRig && g.camRig.shake && g.camRig.shake(0.35);
    const todos = !!e.data.final;
    for (const b of this.braseros) if (b.lit && (todos || Math.hypot(b.x - e.pos.x, b.z - e.pos.z) < 9.5)) this.apagarB(b, true);
    this.temblor = 4.5;
    const p = g.player;
    const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    if (d < 5.5 && !p.dead) {
      p.st = Math.max(0, p.st - p.maxSt * 0.6);
      p.stDelay = Math.max(p.stDelay || 0, 1.2);
    }
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    // lo que espera su momento (en tiempo de juego)
    for (let i = this.pend.length - 1; i >= 0; i--) {
      const q = this.pend[i];
      q.t -= dt;
      if (q.t <= 0) {
        this.pend.splice(i, 1);
        q.fn();
      }
    }
    const e = g.bosses && g.bosses.lobishome;
    const p = g.player;
    // el farol: tiembla con el aullido (y en la tercera fase, alumbra menos)
    this.temblor = Math.max(0, this.temblor - dt);
    const base = e && e.data && e.data.final && !e.dead ? 0.78 : 1;
    const tk = this.temblor > 0 ? 0.32 + 0.25 * Math.abs(Math.sin(g.time * 23)) * Math.min(1, this.temblor) + 0.4 * (1 - Math.min(1, this.temblor / 4.5)) : 1;
    this.farolK = base * Math.min(1, tk);
    // (sólo en la lobera; al salir, se le devuelve)
    const enLobera = p && p.pos.y < -14 && p.pos.y > -20 && !g.cutscene;
    if (enLobera) {
      p.lampK = 0.7 + 0.3 * this.farolK;
      this._farol = true;
    } else if (this._farol && p) {
      p.lampK = 1;
      this._farol = false;
    }
    if (!e) return;
    // el cuerpo, en lo oscuro, se apaga: sólo los ojos
    this.sombra(e, dt);
  }
  sombra(e, dt) {
    const rig = e.rig;
    rig.own();
    if (!this._mats) {
      this._eyes = rig.meshes.filter((m) => m.userData.matName === 'eyeGlow');
      this._body = rig.meshes.filter((m) => m.userData.matName !== 'eyeGlow');
      this._mats = [...new Set(this._body.map((m) => m.material))];
      for (const m of this._mats) m.userData.baseColor = m.color.clone();
      this.vis = 1;
    }
    let want = 1;
    if (!e.dead && e.state !== 'bossIdle' && e.state !== 'alert') {
      e.rig.worldPos('chest', _v);
      const l = this.luzEn(_v.x, e.pos.y, _v.z);
      want = l < 0.06 ? 0 : Math.min(1, (l - 0.06) / 0.3);
      // (golpeando, un instante: la silueta)
      if (e.state === 'attack') want = Math.max(want, 0.45);
      if (e.data.luna) want = 1;
    }
    if (e.state === 'bossIdle') want = 0.05;
    this.vis += (want - this.vis) * Math.min(1, dt * 6);
    const k = this.vis;
    for (const m of this._mats) m.color.copy(m.userData.baseColor).multiplyScalar(0.06 + 0.94 * k);
    for (const m of this._body) m.visible = e.obj.visible && k > 0.04;
    // los ojos, más vivos cuanto más oscuro
    for (const m of this._eyes) m.material.emissiveIntensity = (m.userData.baseEI ?? 2.2) * (1.6 - 0.6 * k) * (e.dead ? Math.max(0, 1 - e.stT * 0.5) : 1);
    e.shadow.visible = e.shadow.visible && k > 0.2;
  }

  // ------------------------------------------------------------ partida
  onRespawn() {
    this.activo = false;
    this.pend.length = 0;
    this.temblor = 0;
    this.farolK = 1;
    this.apagarTodos(false);
  }
  applyFlags() {
    this.apagarTodos(false);
  }
}
