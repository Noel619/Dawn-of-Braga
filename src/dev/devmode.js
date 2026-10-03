// Modo desarrollador: F2 abre un panel para probar el juego (invulnerable,
// aguante infinito, volar atravesando paredes, velocidad del juego, IA
// congelada o ciega, el estado de cada criatura sobre su cabeza, órdenes al
// Descoyuntado, teletransporte, objetos y armas, el parry...). Sólo se abre
// en localhost o desde la IP del autor (access.js); a cualquier otro
// jugador F2 no le hace nada.
//
// Desde la consola (o las pruebas automáticas): __game.dev.set('god', true),
// __game.dev.act('rage'), __game.dev.tp('lagar')...
import * as THREE from 'three';
import { checkAccess, isLocalHost, myIpHash } from './access.js';
import { WEAPONS, WEAPON_ORDER } from '../entities/weapons.js';
import { ITEMS, AREA_NAMES } from '../game/story.js';
import { CELLAR } from '../world/level_cellar.js';

const CSS = `
#devpanel { position: fixed; top: 8px; right: 8px; width: 318px; max-height: calc(100vh - 16px); overflow-y: auto; z-index: 50;
  background: rgba(12, 9, 7, 0.93); border: 2px solid #5a3a22; box-shadow: 0 0 0 2px #060505, 4px 4px 0 rgba(0,0,0,0.5);
  font: 17px/1.15 'Handjet', monospace; color: #d6cbb4; padding: 6px 8px 8px; cursor: default; user-select: none; }
#devpanel .dh { font: 12px/1.6 'Silkscreen', monospace; letter-spacing: 1px; color: #f5d88a; display: flex; justify-content: space-between; border-bottom: 1px solid #5a3a22; margin-bottom: 4px; }
#devpanel .ds { margin-top: 6px; }
#devpanel .dt { font: 11px/1.5 'Silkscreen', monospace; letter-spacing: 1px; color: #a89c85; text-transform: uppercase; }
#devpanel button { display: inline-block; margin: 2px 2px 0 0; padding: 1px 7px 2px; border: 1px solid #5a3a22; background: #16120f; color: #d6cbb4; cursor: pointer; font: inherit; }
#devpanel button:hover { border-color: #d0a24c; color: #f0e7d2; }
#devpanel button.on { background: #5a3a22; color: #f5d88a; border-color: #d0a24c; }
#devpanel .di { white-space: pre; font: 15px/1.2 'Handjet', monospace; color: #a89c85; min-height: 3.6em; }
#devpanel .dlog { white-space: pre-wrap; font: 15px/1.2 'Handjet', monospace; color: #a89c85; max-height: 7.5em; overflow-y: auto; }
#devpanel select { width: 100%; margin-top: 3px; background: #16120f; color: #d6cbb4; border: 1px solid #5a3a22; font: inherit; }
#devtags { position: fixed; inset: 0; pointer-events: none; z-index: 40; }
#devtags div { position: absolute; transform: translate(-50%, -100%); white-space: pre; text-align: center; font: 14px/1.1 'Handjet', monospace; color: #f0e7d2; text-shadow: 1px 1px 0 #060505, -1px 0 0 #060505, 0 -1px 0 #060505; }
#devtags div.boss { color: #f5d88a; }
#devparry { position: fixed; left: 50%; bottom: 33%; transform: translateX(-50%); font: 12px/1 'Silkscreen', monospace; letter-spacing: 2px; color: #f5d88a; text-shadow: 1px 1px 0 #060505; z-index: 41; pointer-events: none; }
`;

export class DevMode {
  constructor(game) {
    this.g = game;
    this.allowed = isLocalHost();
    this.open = false;
    // ajustes
    this.god = false;
    this.stamina = false;
    this.fly = false;
    this.speed = 1;
    this.timeScale = 1;
    this.freezeAI = false;
    this.invisible = false;
    this.tags = false;
    this.marks = false;
    this.parryShow = false;
    this.log = [];
    addEventListener('keydown', (e) => {
      if (e.code !== 'F2') return;
      e.preventDefault();
      this.toggle();
    });
  }

  // ------------------------------------------------------------ panel
  async toggle() {
    if (this.open) return this.close();
    if (!this.allowed) this.allowed = await checkAccess();
    if (!this.allowed) return;
    this.show();
  }
  show() {
    if (!this.allowed) return;
    this.build();
    this.open = true;
    this.el.classList.remove('hidden');
    this.refresh();
    // el ratón, suelto para el panel (el juego sigue: con un clic en él se
    // vuelve a capturar)
    this.g.input.exitLock();
  }
  close() {
    this.open = false;
    if (this.el) this.el.classList.add('hidden');
    const g = this.g;
    if (g.state === 'play' && !g.ui.modal) g.input.requestLock();
  }

  build() {
    if (this.el) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const el = (this.el = document.createElement('div'));
    el.id = 'devpanel';
    el.className = 'hidden';
    // (que los clics del panel no lleguen al juego como golpes)
    for (const ev of ['mousedown', 'mouseup', 'click', 'contextmenu', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation());
    const B = (k, label, kind = 'toggle') => `<button data-${kind === 'toggle' ? 'k' : 'a'}="${k}">${label}</button>`;
    el.innerHTML = `
      <div class="dh"><span>MODO DESARROLLADOR</span><span>F2</span></div>
      <div class="di" id="dev-info"></div>
      <div class="ds"><div class="dt">Jugador</div>
        ${B('god', 'Invulnerable')}${B('stamina', 'Aguante infinito')}${B('fly', 'Volar (atraviesa muros)')}
        ${B('speed', 'Velocidad ×1')}${B('heal', 'Curar', 'act')}${B('weapons', 'Todas las armas', 'act')}${B('items', 'Todos los objetos', 'act')}${B('weapon', 'Arma: —', 'act')}
      </div>
      <div class="ds"><div class="dt">Tiempo</div>
        ${B('slow', 'Velocidad del juego ×1')}${B('hud', 'HUD', 'act')}${B('fps', 'FPS', 'act')}
      </div>
      <div class="ds"><div class="dt">IA</div>
        ${B('freezeAI', 'Congelar IA')}${B('invisible', 'Invisible para la IA')}${B('tags', 'Estado de la IA')}${B('marks', 'Puestos del Descoyuntado')}
        ${B('killNear', 'Matar criaturas cercanas', 'act')}${B('resetEnemies', 'Reiniciar criaturas', 'act')}
      </div>
      <div class="ds"><div class="dt">El Descoyuntado</div>
        ${B('descHere', 'Traerlo aquí', 'act')}${B('descShadow', 'Que te siga', 'act')}${B('descAmbush', 'Emboscada', 'act')}${B('descHunt', 'Que te cace', 'act')}
        ${B('descBurrow', 'A una gruta', 'act')}${B('rage', 'Enloquecer', 'act')}${B('calm', 'Calmar', 'act')}${B('descKill', 'Matarlo', 'act')}
      </div>
      <div class="ds"><div class="dt">Parry</div>
        ${B('parryShow', 'Mostrar la ventana de parry')}
        <div class="dlog" id="dev-log"></div>
      </div>
      <div class="ds"><div class="dt">Teletransporte</div>
        <select id="dev-tp"><option value="">— elige un sitio —</option></select>
        ${B('mark', 'Guardar posición', 'act')}${B('back', 'Volver a ella', 'act')}${isLocalHost() ? B('iphash', 'Huella de mi IP', 'act') : ''}
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.k) this.flip(b.dataset.k);
      else if (b.dataset.a) this.act(b.dataset.a);
      this.refresh();
    });
    const sel = el.querySelector('#dev-tp');
    for (const d of this.places()) {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = d.name;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      if (sel.value) this.tp(sel.value);
      sel.value = '';
    });
    this.tagsEl = document.createElement('div');
    this.tagsEl.id = 'devtags';
    document.body.appendChild(this.tagsEl);
    this.parryEl = document.createElement('div');
    this.parryEl.id = 'devparry';
    document.body.appendChild(this.parryEl);
  }

  refresh() {
    if (!this.el) return;
    for (const b of this.el.querySelectorAll('button[data-k]')) {
      const k = b.dataset.k;
      b.classList.toggle('on', k === 'speed' ? this.speed !== 1 : k === 'slow' ? this.timeScale !== 1 : !!this[k]);
    }
    const q = (s) => this.el.querySelector(s);
    q('button[data-k="speed"]').textContent = `Velocidad ×${this.speed}`;
    q('button[data-k="slow"]').textContent = `Velocidad del juego ×${this.timeScale}`;
    const w = this.g.player.weapon;
    q('button[data-a="weapon"]').textContent = `Arma: ${w ? w.id : '—'}`;
  }

  // ------------------------------------------------------------ ajustes y órdenes
  set(k, v) {
    if (k === 'speed' || k === 'timeScale') this[k] = +v;
    else this[k] = !!v;
    if (k === 'marks') this.showMarks(this.marks);
    if (k === 'fly' && !v) this.land();
    this.refresh();
  }
  flip(k) {
    if (k === 'speed') return this.set('speed', this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1);
    if (k === 'slow') return this.set('timeScale', this.timeScale === 1 ? 0.5 : this.timeScale === 0.5 ? 0.25 : this.timeScale === 0.25 ? 2 : 1);
    this.set(k, !this[k]);
  }
  desc() {
    return this.g.bosses.descoyuntado || null;
  }
  act(a) {
    const g = this.g,
      p = g.player;
    const e = this.desc(),
      D = e && e.D;
    // las órdenes al Descoyuntado sólo valen con la caza en marcha
    const hunt = () => {
      if (!e || e.dead) return false;
      if (!g.hunt.active) {
        g.flags['cine:sotano'] = true;
        g.hunt.start('return');
      }
      return g.hunt.active;
    };
    switch (a) {
      case 'heal':
        p.hp = p.maxHp;
        p.st = p.maxSt;
        p.flasks = p.maxFlasks;
        break;
      case 'weapons':
        for (const id of WEAPON_ORDER) if (!g.inventory.has(WEAPONS[id].item)) g.inventory.add(WEAPONS[id].item);
        if (!g.inventory.has('escudo')) g.inventory.add('escudo');
        p.setEquipment(true, true);
        break;
      case 'items':
        for (const id in ITEMS) if (!ITEMS[id].upgrade && !g.inventory.has(id)) g.inventory.add(id);
        p.setEquipment(g.hasWeapon(), g.inventory.has('escudo'));
        break;
      case 'weapon': {
        const i = WEAPON_ORDER.indexOf(p.weaponId);
        const id = WEAPON_ORDER[(i + 1) % WEAPON_ORDER.length];
        if (!g.inventory.has(WEAPONS[id].item)) g.inventory.add(WEAPONS[id].item);
        p.equipWeapon(id);
        p.setEquipment(true, g.inventory.has('escudo'));
        break;
      }
      case 'hud':
        this.hudOff = !this.hudOff;
        g.ui.showHud(!this.hudOff);
        break;
      case 'fps':
        g.settings.fps = !g.settings.fps;
        break;
      case 'killNear':
        for (const c of g.activeEnemies) if (!c.dead && !c.boss && c.distTo(p.pos) < 25) c.die();
        break;
      case 'resetEnemies':
        for (const c of g.enemies) if (!(c.boss && g.flags['boss:' + c.type])) c.reset();
        break;
      case 'descHere':
        if (!hunt()) break;
        {
          const f = p.forward();
          const x = p.pos.x + f.x * 6,
            z = p.pos.z + f.z * 6;
          const nav = g.navCellar;
          const c = nav.nearest(nav.ci(x), nav.cj(z), 8);
          if (c) e.pos.set(nav.x0 + (c[0] + 0.5) * nav.res, CELLAR.FLOOR, nav.z0 + (c[1] + 0.5) * nav.res);
          D.air = null;
          D.plane = 'floor';
          D.hidden = false;
          D.burrow = null;
          e.obj.visible = true;
          D.plantAll();
          D.engage();
        }
        break;
      case 'descShadow':
        if (hunt() && D.stage === 'stalk') D.startShadow();
        break;
      case 'descAmbush':
        if (hunt()) {
          const A = D.chooseAmbush({ min: 3, max: 30 }) || D.chooseAmbush({ min: 1, max: 60, rage: true });
          if (A) D.startAmbush(A, D.stage === 'rage');
        }
        break;
      case 'descHunt':
        if (hunt()) D.startHunt();
        break;
      case 'descBurrow':
        if (hunt()) {
          const b = D.chooseBurrow() || D.chooseBurrow(true);
          if (b) {
            D.burrow = { ...b, t: 0, stage: 'go' };
            D.setMode('burrow');
          }
        }
        break;
      case 'rage':
        if (hunt()) D.startRage('frustration');
        break;
      case 'calm':
        if (hunt() && D.stage === 'rage') {
          D.stage = 'stalk';
          D.frenzy = false;
          D.frust = 0;
          D.perch = null;
          D.setMode('stalk');
        }
        break;
      case 'descKill':
        if (e && !e.dead) e.die();
        break;
      case 'mark':
        this.saved = { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw };
        break;
      case 'back':
        if (this.saved) this.teleport(this.saved.x, this.saved.y, this.saved.z, this.saved.yaw);
        break;
      case 'iphash':
        myIpHash().then((r) => this.note(r ? `IP ${r.ip}\nhuella ${r.hash}` : 'No se pudo averiguar la IP pública'));
        break;
    }
  }

  // Huella de la IP pública actual (para añadirla a DEV_IP_HASHES en
  // access.js): __game.dev.ipHash() en la consola.
  async ipHash() {
    const r = await myIpHash();
    if (r) console.info(`[modo desarrollador] IP ${r.ip} · huella ${r.hash}`);
    else console.info('[modo desarrollador] no se pudo averiguar la IP pública');
    return r;
  }

  // ------------------------------------------------------------ teletransporte
  places() {
    if (this._places) return this._places;
    const g = this.g;
    const out = [];
    for (const it of g.interact.list) if (it.kind === 'altar' && it.spawn) out.push({ id: 'altar:' + it.id, name: '✝ ' + (it.label || it.name || it.id), at: [it.spawn[0], it.spawn[1], it.spawn[2]], yaw: it.yaw || 0 });
    const seen = new Set();
    for (const z of g.level.L.zones) {
      if (seen.has(z.id) || !z.rects || !z.rects.length) continue;
      seen.add(z.id);
      const r = z.rects[0];
      out.push({ id: z.id, name: AREA_NAMES[z.id] || z.id, at: [(r[0] + r[2]) / 2, r[4] + 0.5, (r[1] + r[3]) / 2], zone: true });
    }
    return (this._places = out);
  }
  // Por id de zona o de altar ('lagar', 'altar:a_capilla'...).
  tp(id) {
    const d = this.places().find((q) => q.id === id);
    if (!d) return false;
    let [x, y, z] = d.at;
    if (d.zone) {
      // la celda transitable más cercana al centro de la zona
      const g = this.g;
      const nav = y < -5 && g.inCellar({ x, y, z }) ? g.navCellar : g.inDungeon({ x, y, z }) ? g.navDungeon : y < -3 ? g.navCrypt : g.navSurface;
      const c = nav && nav.nearest(nav.ci(x), nav.cj(z), 12);
      if (c) {
        x = nav.x0 + (c[0] + 0.5) * nav.res;
        z = nav.z0 + (c[1] + 0.5) * nav.res;
      }
      y = g.world.col.groundHeight(x, z, 0.3, y + 1.5);
    }
    this.teleport(x, y, z, d.yaw ?? this.g.player.yaw);
    return true;
  }
  teleport(x, y, z, yaw) {
    const g = this.g,
      p = g.player;
    p.body.pos.set(x, y, z);
    p.body.vy = 0;
    p.visY = y;
    p.yaw = yaw;
    p.vx = p.vz = 0;
    g.camRig.snapTo(p);
    g.lockTarget = null;
  }

  // ------------------------------------------------------------ volar
  // Atraviesa muros, sin gravedad: WASD según la cámara, Espacio sube, C baja,
  // Mayús deprisa.
  flyMove(p, dt, input, cam) {
    const k = input.keys;
    const mv = input.move();
    const cy = cam.yaw,
      cp = cam.pitch;
    const fx = Math.sin(cy) * Math.cos(cp),
      fy = -Math.sin(cp),
      fz = Math.cos(cy) * Math.cos(cp);
    const rx = -Math.cos(cy),
      rz = Math.sin(cy);
    let vy = (k.has('Space') ? 1 : 0) - (k.has('KeyC') ? 1 : 0);
    const sp = 7 * this.speed * (input.down('sprint') ? 3 : 1);
    const x = (fx * mv.y + rx * mv.x) * sp,
      z = (fz * mv.y + rz * mv.x) * sp;
    vy = (fy * mv.y + vy) * sp;
    p.body.pos.x += x * dt;
    p.body.pos.y += vy * dt;
    p.body.pos.z += z * dt;
    p.body.vy = 0;
    p.body.grounded = true;
    p.visY = p.body.pos.y;
    p.vx = x * 0.3;
    p.vz = z * 0.3;
    if (Math.hypot(x, z) > 0.3) p.yaw = Math.atan2(x, z);
  }
  // al dejar de volar, al suelo que haya debajo
  land() {
    const g = this.g,
      p = g.player;
    const y = g.world.col.groundHeight(p.pos.x, p.pos.z, 0.3, p.pos.y + 0.5);
    if (y > -60) p.body.pos.y = y;
    p.visY = p.body.pos.y;
  }

  // ------------------------------------------------------------ marcas en el mundo
  showMarks(on) {
    const g = this.g;
    if (!this.markGrp) {
      const grp = (this.markGrp = new THREE.Group());
      const geo = new THREE.SphereGeometry(0.18, 8, 6);
      const mk = (c) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.85 });
      const add = (x, y, z, m) => {
        const s = new THREE.Mesh(geo, m);
        s.position.set(x, y, z);
        s.renderOrder = 9;
        grp.add(s);
      };
      const mA = mk(0xff3020),
        mP = mk(0x40a0ff),
        mB = mk(0x40ff60),
        mL = mk(0xffd040);
      for (const a of CELLAR.ambush) add(a.x, a.top - 0.4, a.z, mA);
      for (const q of CELLAR.perches) add(q.x, CELLAR.FLOOR + 3.2, q.z, mP);
      for (const pair of CELLAR.burrows) for (const b of pair) add(b.fx, CELLAR.FLOOR + 0.4, b.fz, mB);
      for (const l of CELLAR.levers) add(l.ix, CELLAR.FLOOR + 1.2, l.iz, mL);
      g.scene.add(grp);
    }
    this.markGrp.visible = on;
  }

  // ------------------------------------------------------------ registro (parry)
  note(s) {
    const t = this.g.time.toFixed(1);
    this.log.unshift(`${t}  ${s}`);
    if (this.log.length > 30) this.log.length = 30;
    if (this.el && this.open) this.el.querySelector('#dev-log').textContent = this.log.slice(0, 10).join('\n');
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    if (!this.allowed) return;
    const g = this.g,
      p = g.player;
    // (con el panel abierto el ratón es del panel: si el juego lo había
    // capturado a destiempo, se suelta)
    if (this.open && g.input.locked) g.input.exitLock();
    if (this.god && !p.dead) p.hp = p.maxHp;
    if (this.stamina) p.st = p.maxSt;
    if (!this.open && !this.tags && !this.parryShow) {
      if (this.tagsEl) this.tagsEl.innerHTML = '';
      if (this.parryEl) this.parryEl.textContent = '';
      return;
    }
    this._infoT = (this._infoT || 0) - dt;
    if (this.open && this._infoT <= 0) {
      this._infoT = 0.15;
      const z = g.zone;
      const D = this.desc() && this.desc().D;
      const lt = g.lockTarget;
      let s = `pos ${p.pos.x.toFixed(2)}, ${p.pos.y.toFixed(2)}, ${p.pos.z.toFixed(2)}  ·  yaw ${((p.yaw * 180) / Math.PI).toFixed(0)}°\n`;
      s += `zona ${z ? z.id : '—'}  ·  ${g.fps} fps  ·  ${p.state}${lt ? '  ·  fijado ' + lt.type : ''}\n`;
      if (D && g.hunt.active) s += `Descoyuntado: ${D.stage} / ${D.mode}${D.atk ? ':' + D.atk.name : ''}  ·  hambre ${D.hunger.toFixed(2)}  ·  frust ${D.frust.toFixed(2)}`;
      else s += `vida ${Math.round(p.hp)}/${p.maxHp}  ·  aguante ${Math.round(p.st)}  ·  ampollas ${p.flasks}`;
      this.el.querySelector('#dev-info').textContent = s;
    }
    // el estado de cada criatura, sobre su cabeza
    if (this.tags && this.tagsEl) {
      const W = innerWidth,
        H = innerHeight;
      const v = this._v || (this._v = new THREE.Vector3());
      let html = '';
      for (const e of g.activeEnemies) {
        if (!e.obj.visible || (e.dead && e.stT > 3)) continue;
        v.set(e.pos.x, e.pos.y + (e.T.height || 1.8) + 0.5, e.pos.z).project(g.camera);
        if (v.z >= 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
        let t;
        if (e.D) {
          const D = e.D;
          t = `${D.stage} · ${D.mode}${D.atk ? ':' + D.atk.name : ''}${D.amb ? ':' + D.amb.stage : ''}\n${D.plane}${D.seen ? ' · te ve' : ''}${D.hidden ? ' · oculto' : ''} · ${D.dist.toFixed(1)} m\nhambre ${D.hunger.toFixed(2)} · frust ${D.frust.toFixed(2)}`;
        } else t = `${e.type} · ${e.state}${e.atk ? ':' + e.atk.name : ''}\n${Math.round(e.hp)}/${e.maxHp}${e.poise !== undefined ? ' · equilibrio ' + Math.round(e.poise) : ''}`;
        if (e.parryT > 0) t += `\nDESEQUILIBRADO ${e.parryT.toFixed(1)}`;
        html += `<div class="${e.boss ? 'boss' : ''}" style="left:${Math.round(((v.x + 1) / 2) * W)}px;top:${Math.round(((1 - v.y) / 2) * H)}px">${t}</div>`;
      }
      this.tagsEl.innerHTML = html;
    } else if (this.tagsEl) this.tagsEl.innerHTML = '';
    // la ventana de parry del jugador
    if (this.parryEl) {
      const w = p.parryWin > 0 ? 'VENTANA DE PARRY' : p.state === 'parry' ? 'PARRY' : '';
      if (this.parryEl.textContent !== w) this.parryEl.textContent = this.parryShow ? w : '';
    }
  }
}
