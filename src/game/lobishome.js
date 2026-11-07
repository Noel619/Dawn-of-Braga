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
import { VERGEL } from '../world/vergel.js';
import { objMat } from '../gfx/materials.js';

const R_FAROL = 4.6;
// (con el farol del sepulturero: un metro más)
const R_FAROL_MEJOR = 5.6;
const R_BRASERO = 6.5;
const _v = new THREE.Vector3();
const _piel = new THREE.Color(0xc8b29c);

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
    // el acecho de antes de la pelea: unos ojos al pie de la escalera de la
    // Sé (detrás de la niebla), que se encienden un instante si miras hacia
    // abajo; y el candil de la raya que se apaga a tu espalda
    const grp = new THREE.Group();
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 4), objMat('eyeGlow'));
      m.position.set(sx * 0.11, 0, 0);
      m.scale.set(1.3, 0.7, 1);
      m.layers.set(1);
      grp.add(m);
    }
    grp.position.set(HONDAS.se.x - 0.2, HONDAS.y.n1 + 2.05, -16.4);
    grp.layers.set(1);
    grp.visible = false;
    g.scene.add(grp);
    this.ojos = grp;
    this.ojosT = 0;
    this.ojosCool = 4;
  }
  // (el candil de la raya: apagado desde que pasaste la reja, hasta que él cae)
  candil(on) {
    this.g.setGroupVisible('raya:3', on);
  }
  acecho(dt, e) {
    const g = this.g,
      p = g.player.pos;
    // el candil, la primera vez que se pasa la reja
    if (!g.flags['lobo:candil'] && !g.flags['boss:lobishome'] && p.y > -12.5 && p.y < -10.5 && p.z < 5 && p.z > 1 && Math.abs(p.x - HONDAS.se.x) < 1.8) {
      g.flags['lobo:candil'] = true;
      this.candil(false);
      const R = VERGEL.raya;
      g.audio && g.audio.play('candleOut', { x: R.x0 + 0.3 + ((R.x1 - R.x0 - 0.6) * 3) / 6, y: VERGEL.y + 0.2, z: R.z });
      g.ui && g.ui.toast(MSG.candilApagado, 4);
    }
    // los ojos al pie de la escalera
    const o = this.ojos;
    this.ojosCool -= dt;
    if (this.ojosT > 0) {
      this.ojosT -= dt;
      const k = this.ojosT;
      o.visible = k > 0 && !(k > 0.7 && k < 0.78);
      if (k <= 0) o.visible = false;
      return;
    }
    o.visible = false;
    if (this.ojosCool > 0 || g.state !== 'play' || !e || e.dead || e.aware || g.flags['boss:lobishome']) return;
    const enEscalera = Math.abs(p.x - HONDAS.se.x) < 1.7 && p.z < -0.5 && p.z > -11.6 && p.y < -11.3 && p.y > -16.4;
    if (!enEscalera) return;
    const cam = g.camera;
    const to = new THREE.Vector3().subVectors(o.position, cam.position).normalize();
    const fw = new THREE.Vector3();
    cam.getWorldDirection(fw);
    if (fw.dot(to) < 0.93) return;
    this.ojosT = 1.4;
    this.ojosCool = 35 + Math.random() * 30;
    o.visible = true;
    g.audio && g.audio.play('snarl', { x: o.position.x, y: o.position.y, z: o.position.z }, { gain: 0.45 });
  }

  // ------------------------------------------------------------ la luz
  // (farol = false: sin la luz de tu propio farol; la de los braseros y la
  // de la luna, la que hay en el sitio)
  luzEn(x, y, z, farol = true) {
    const g = this.g;
    const p = g.player;
    let l = 0;
    if (farol && p && !p.dead) {
      const r = (p.farolMejor ? R_FAROL_MEJOR : R_FAROL) * this.farolK;
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

  // El polvo y la tierra que caen de la bóveda (el aviso de que se va a
  // dejar caer desde arriba) o que te echa encima (el entierro).
  polvo(x, y, z, encima = false) {
    const g = this.g;
    if (!g.fx || !g.fx.blood) return;
    if (encima) {
      g.fx.blood.emit(x, y + 2.6, z, 10, { color: [0.3, 0.25, 0.2], speed: 1.4, life: 0.9, up: 2.2, gravity: -9 });
      return;
    }
    const top = y + 3.5;
    for (let k = 0; k < 3; k++) g.fx.blood.emit(x + (Math.random() - 0.5) * 1.6, top, z + (Math.random() - 0.5) * 1.6, 4, { color: [0.42, 0.38, 0.32], speed: 0.3, life: 1.2, up: 0, gravity: -7 });
  }
  // Te ha soltado (o te has soltado): el farol vuelve, temblando.
  farolVuelve() {
    this.temblor = Math.max(this.temblor, 2.2);
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
    // (en sus fauces o enterrándote: el farol, apagado)
    const presa = e && !e.dead && (e.state === 'arrastrando' || e.state === 'enterrando');
    this.farolK = presa ? 0.1 : base * Math.min(1, tk);
    // (sólo en la lobera; al salir, se le devuelve)
    const enLobera = p && p.pos.y < -14 && p.pos.y > -20 && !g.cutscene;
    if (enLobera) {
      p.lampK = this.farolK < 0.2 ? 0.05 : 0.7 + 0.3 * this.farolK;
      this._farol = true;
    } else if (this._farol && p) {
      p.lampK = 1;
      this._farol = false;
    }
    this.flor = this.florEstado(e);
    this.acecho(dt, e);
    if (!e) return;
    if (e.dead && e.data && e.data.hombreT === undefined) this.muere(e);
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
      this._piel = new Set(this._body.filter((m) => m.userData.matName === 'loboPiel').map((m) => m.material));
      this.vis = 1;
    }
    // (lo del lobo y lo del hombre: muerto, al rato, se le ve el hombre)
    const D = e.data || {};
    if (e.dead && D.hombreT !== undefined) D.hombreT += dt;
    const h = e.dead && D.hombreT !== undefined ? Math.min(1, Math.max(0, (D.hombreT - 1.6) / 2.2)) : 0;
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
    // (trepando por la bóveda: ni los ojos)
    const oculto = !!(e.data && e.data.oculto);
    if (oculto) want = 0;
    this.vis += (want - this.vis) * Math.min(1, dt * 6);
    const k = this.vis;
    for (const m of this._mats) {
      m.color.copy(m.userData.baseColor).multiplyScalar(0.06 + 0.94 * k);
      // (la piel del hombre, más clara)
      if (h > 0 && this._piel.has(m)) m.color.lerp(_piel, h * 0.45);
    }
    for (const m of this._body) {
      const g2 = m.userData.grp;
      m.visible = e.obj.visible && k > 0.04 && (g2 === 'lobo' ? h < 0.5 : g2 === 'hombre' ? h >= 0.5 : true);
    }
    // los ojos, más vivos cuanto más oscuro
    for (const m of this._eyes) {
      m.visible = e.obj.visible && !oculto;
      m.material.emissiveIntensity = (m.userData.baseEI ?? 2.2) * (1.6 - 0.6 * k) * (e.dead ? Math.max(0, 1 - e.stT * 0.5) : 1);
    }
    e.shadow.visible = e.shadow.visible && k > 0.2;
  }

  // Muerto: cae como lobo y, al rato, se le ve el hombre (lo del lobo se le
  // va, la piel se le aclara); su última palabra.
  muere(e) {
    if (e.data.hombreT !== undefined) return;
    this.activo = false;
    // (y el candil de la raya: él lo vuelve a encender)
    this.candil(true);
    e.data.hombreT = 0;
    this.pend.push({ t: 3.2, fn: () => this.g.ui && this.g.ui.toast(MSG.loboHermano, 6) });
  }
  // La flor blanca (si la llevas), en el marcador: se cierra cuando él está
  // cerca y no se le ve.
  florEstado(e) {
    const g = this.g,
      p = g.player;
    if (!g.inventory || !g.inventory.has('flor_blanca') || !p || p.dead) return null;
    if (p.pos.y > -14 || p.pos.y < -20) return null;
    if (!e || e.dead || g.flags['boss:lobishome']) return null;
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    return d < 11 && (this.vis ?? 0) < 0.35 ? 'cerrada' : 'abierta';
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
    const F = this.g.flags;
    this.candil(!(F['lobo:candil'] && !F['boss:lobishome']));
  }
}
