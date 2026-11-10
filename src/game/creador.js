// El editor de personaje: después de la introducción, al empezar una partida
// nueva, antes de despertar en la celda (como en los Souls). Sin clases:
// sólo quién era el preso, que se dejó las uñas y la memoria en la pared. El
// nombre, el rostro de base y sus rasgos, el peinado, la barba, los colores
// (pelo, ojos, piel), una cicatriz y la complexión (entities/aspecto.js).
//
// A la izquierda, la lista (como las opciones: arriba y abajo se elige, a los
// lados se cambia; «confirmar» entra en los rasgos, escribe el nombre o
// despierta); a la derecha, él, de pie en lo oscuro bajo una luz, con el
// farol al cinto y la armadura de la guardia sin el yelmo (se ve también con
// él y sin nada). La cámara se acerca a la cara para la cara y se aleja para
// el cuerpo; se le gira con Q y R (LB y RB, o el stick derecho) o
// arrastrando con el ratón, y la rueda acerca y aleja.
//
// El escenario está lejos de todo (STAGE: muy por debajo de la ciudad, donde
// la niebla negra se lo come todo), con dos luces del juego (game/effects:
// LightPool; sin luces nuevas que obliguen a recompilar nada) y su suelo.
import * as THREE from 'three';
import { ROSTROS, RASGOS, PEINADOS, BARBAS, COLORES_PELO, PIELES, OJOS, CICATRICES, NOMBRES, NOMBRE_MAX, alAzar, normalizar, limpiarNombre } from '../entities/aspecto.js';
import { PIEZAS_GUARDIA } from '../entities/armaduras.js';
import { ITEMS } from './story.js';
import { objMat } from '../gfx/materials.js';
import { spriteHtml, arrowBitmap, notchBitmap } from '../ui/pixel.js';
import { clamp, damp } from '../core/util.js';

const $ = (id) => document.getElementById(id);
// el rótulo de antes de despertar (en segundos desde «Despertar»): sale ya a
// negro, se va y, mientras se va, se despierta
const ROTULO = { sale: 1.0, va: 3.4, fin: 4.0 };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// el escenario: lejos de todo lo del mundo
export const STAGE = { x: 0, y: -260, z: 0 };
// lo que lleva puesto mientras se le mira
const VISTAS = [
  { id: 'sinYelmo', nombre: 'Sin el yelmo' },
  { id: 'armado', nombre: 'Con el yelmo' },
  { id: 'desnudo', nombre: 'Sin armadura' },
];
// a qué se acerca la cámara con cada cosa (0: el cuerpo entero; 1: la cara)
const CERCA = { nombre: 0.15, rostro: 1, rasgos: 1, peinado: 0.85, colorPelo: 0.85, barba: 1, ojos: 1, cicatriz: 1, piel: 0.45, complexion: 0, vista: 0.1, azar: 0.25, listo: 0, volver: 1, si: 0, no: 0 };
const DESC = {
  nombre: 'Él sabe tu nombre.',
  rostro: 'El rostro de base; luego se afina con los rasgos.',
  rasgos: 'La cara, rasgo a rasgo.',
  peinado: 'Bajo el yelmo no se verá.',
  colorPelo: 'El del pelo, el de la barba y el de las cejas.',
  barba: 'La que llevaba: en la celda no hubo con qué afeitarse.',
  ojos: 'El color de los ojos.',
  piel: 'El color de la piel.',
  cicatriz: 'Una marca de antes de la celda.',
  complexion: 'De enjuto a corpulento. La armadura se ajusta al cuerpo.',
  vista: 'Cómo se le ve aquí (despertará con la armadura de la guardia).',
  azar: 'Otro cualquiera.',
  listo: 'Así era. Despertar en la celda.',
  volver: 'De vuelta a la lista.',
  si: 'Despertar en la celda.',
  no: 'Seguir recordando.',
};

export class Creador {
  constructor(game) {
    this.g = game;
    this.activo = false;
    this.stage = null;
    // el nombre se escribe en un campo de texto de verdad (el teclado no
    // llega al juego mientras se escribe)
    const inp = $('cr-input');
    this.inp = inp;
    if (inp) {
      inp.maxLength = NOMBRE_MAX;
      const stop = (e) => e.stopPropagation();
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
          e.preventDefault();
          inp.blur();
        }
      });
      inp.addEventListener('keyup', stop);
      inp.addEventListener('keypress', stop);
      inp.addEventListener('input', () => {
        const n = limpiarNombre(inp.value);
        if (n) this.a.nombre = n;
        this.pintarNombre();
      });
      inp.addEventListener('blur', () => {
        this.escribiendo = false;
        inp.value = this.a.nombre;
        this.render();
      });
    }
    // girarle arrastrando con el ratón (fuera del panel) y acercarse con la rueda
    const cv = game.canvas;
    cv.addEventListener('mousedown', (e) => {
      if (this.activo && e.button === 0) this.arrastre = true;
    });
    addEventListener('mouseup', () => (this.arrastre = false));
    addEventListener('mousemove', (e) => {
      if (this.activo && this.arrastre) this.giro += e.movementX * 0.012;
    });
    cv.addEventListener(
      'wheel',
      (e) => {
        if (!this.activo) return;
        this.zoom = clamp(this.zoom - Math.sign(e.deltaY) * 0.12, -0.6, 0.6);
      },
      { passive: true }
    );
  }

  // ------------------------------------------------------------ abrir y cerrar
  // Abre el editor (con el jugador ya vestido de la guardia); al despertar,
  // done(). Lo de la partida (la armadura que lleva, si va armado) queda como
  // estaba: aquí sólo se mira.
  abrir(done, o = {}) {
    const g = this.g,
      p = g.player;
    this.done = done;
    // (al empezar partida: el rótulo de siempre, a oscuras, al despertar)
    this.rotulo = o.rotulo || null;
    this._rotulo = 0;
    this.activo = true;
    this.cerrando = 0;
    this.a = normalizar(p.aspecto);
    this.aspecto0 = p.aspecto;
    this.armor0 = { ...p.armor };
    this.equipo0 = [p.hasSword, p.hasShield];
    this.ground0 = p._groundFn;
    this.vista = 0;
    this.sub = null;
    this.sel = 0;
    this.giro = 0;
    this.zoom = 0;
    this.cerca = 0.15;
    this.escribiendo = false;
    this._built = undefined;
    this.montar();
    const el = $('creador');
    if (el) el.classList.remove('saliendo');
    g.state = 'creador';
    g.lockTarget = null;
    // él, de pie en el escenario, de cara a la cámara, sin el arma ni el escudo
    p.spawn(STAGE.x, STAGE.y, STAGE.z, 0);
    p.obj.visible = true;
    p.setEquipment(false, false);
    p._groundFn = () => STAGE.y;
    p.vx = p.vz = 0;
    this.vestir();
    // la luz, la niebla y el sonido del sitio
    g.atmo.set('prison', true);
    g.atmo.override = { fog: 0x060504, sky: 0x4a4038, ground: 0x120e0b, density: 0.07, hemi: 0.75, moon: 0, vol: 0, ash: 0.45, exposure: 1.2, sat: 0.84, bloom: 1.05, lamp: 2.6, snap: true };
    g.audio && g.audio.setZone('prison');
    g.audio && g.audio.music('sanctuary');
    g.ui.showHud(false);
    g.fadeTarget = 1;
    const s = g.ui.open('creador', {});
    s.fresh = true;
    if (this.inp) this.inp.value = this.a.nombre;
    this.render();
  }
  // el suelo y las luces del escenario (una vez; luego se enciende y apaga)
  montar() {
    const g = this.g;
    if (!this.stage) {
      const grp = new THREE.Group();
      const geo = new THREE.CircleGeometry(4.5, 48).rotateX(-Math.PI / 2);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4.5, uv.getY(i) * 4.5);
      const suelo = new THREE.Mesh(geo, objMat('flag'));
      suelo.position.set(STAGE.x, STAGE.y - 0.002, STAGE.z);
      grp.add(suelo);
      g.scene.add(grp);
      // la luz de arriba (cálida, como de una vela grande) y la de detrás (fría)
      const L = g.fx.lights;
      this.luces = [
        L.add({ x: STAGE.x + 0.9, y: STAGE.y + 2.5, z: STAGE.z + 1.7, color: 0xffb47a, intensity: 9.5, range: 9, flicker: 1, on: false, priority: 9 }),
        L.add({ x: STAGE.x - 1.4, y: STAGE.y + 2.1, z: STAGE.z - 1.9, color: 0x8494c4, intensity: 6, range: 8, flicker: 0, on: false, priority: 9 }),
      ];
      this.stage = grp;
    }
    this.stage.visible = true;
    for (const l of this.luces) l.on = true;
  }

  // Así se le ve ahora: su aspecto, con lo que lleve puesto según la vista
  vestir() {
    const p = this.g.player;
    const V = VISTAS[this.vista].id;
    p.aspecto = this.a;
    const arm = {};
    for (const k in p.armor) arm[k] = null;
    if (V !== 'desnudo') for (const id of PIEZAS_GUARDIA) arm[ITEMS[id].armor] = id;
    if (V === 'sinYelmo') arm.head = null;
    p.armor = arm;
    p.vestir();
    p.rig.setProbe(0.34, 0.3, 0.28, STAGE.y);
  }

  // Despertar: fundido a negro y, a oscuras, todo en su sitio (al empezar
  // partida, con el rótulo de siempre: «Braga. Tercera noche después de la
  // caída.», que se aclara cuando ya está a negro y se va al despertar)
  terminar() {
    if (this.cerrando) return;
    this.cerrando = this.rotulo ? ROTULO.fin : 1.1;
    this.cerrandoT = 0;
    this.g.fadeTarget = 0;
    // (la lista se va con él: ui.css, #creador.saliendo)
    const el = $('creador');
    if (el) el.classList.add('saliendo');
    this.g.audio && this.g.audio.ui('confirm');
    this.g.audio && this.g.audio.stopMusic();
  }
  cerrar(ok = true) {
    const g = this.g,
      p = g.player;
    if (!this.activo) return;
    this.activo = false;
    if (this.inp) this.inp.blur();
    if (g.ui.top && g.ui.top.name === 'creador') g.ui.close();
    // lo suyo: el aspecto elegido; lo de la partida, como estaba
    p.aspecto = ok ? normalizar(this.a) : this.aspecto0;
    p.armor = { ...this.armor0 };
    p.refreshMods();
    p.vestir();
    p.setEquipment(this.equipo0[0], this.equipo0[1]);
    p._groundFn = this.ground0;
    if (this.stage) this.stage.visible = false;
    for (const l of this.luces || []) l.on = false;
    g.atmo.override = null;
    g.camRig.override = null;
    const d = this.done;
    this.done = null;
    if (ok && d) d();
  }
  // (volver al título a mitad: nada de lo elegido)
  abortar() {
    this.done = null;
    if (this._rotulo === 1) this.g.intro.unsay();
    this.cerrar(false);
  }

  // ------------------------------------------------------------ la lista
  entradas() {
    if (this.sub === 'rasgos') return [...RASGOS.map((R) => ({ id: R.id, label: R.nombre, kind: 'rasgo', foco: 'rasgos' })), { id: 'volver', label: 'Volver', kind: 'accion' }];
    if (this.sub === 'confirmar')
      return [
        { id: 'si', label: 'Despertar', kind: 'accion' },
        { id: 'no', label: 'Seguir recordando', kind: 'accion' },
      ];
    return [
      { id: 'nombre', label: 'Nombre', kind: 'nombre' },
      { id: 'rostro', label: 'Rostro', kind: 'lista', list: ROSTROS },
      { id: 'rasgos', label: 'Rasgos de la cara', kind: 'sub' },
      { id: 'peinado', label: 'Peinado', kind: 'lista', list: PEINADOS },
      { id: 'colorPelo', label: 'Color del pelo', kind: 'lista', list: COLORES_PELO },
      { id: 'barba', label: 'Barba', kind: 'lista', list: BARBAS },
      { id: 'ojos', label: 'Ojos', kind: 'lista', list: OJOS },
      { id: 'piel', label: 'Piel', kind: 'lista', list: PIELES },
      { id: 'cicatriz', label: 'Cicatriz', kind: 'lista', list: CICATRICES },
      { id: 'complexion', label: 'Complexión', kind: 'barra' },
      { id: 'vista', label: 'Verle', kind: 'vista' },
      { id: 'azar', label: 'Al azar', kind: 'accion' },
      { id: 'listo', label: 'Despertar', kind: 'accion' },
    ];
  }
  // Cambia lo de una entrada (d: -1 o 1). Devuelve si cambió algo.
  cambiar(e, d) {
    const a = this.a;
    if (e.kind === 'lista') {
      const L = e.list;
      const i = Math.max(
        0,
        L.findIndex((x) => x.id === a[e.id])
      );
      a[e.id] = L[(i + d + L.length) % L.length].id;
    } else if (e.kind === 'barra') a.complexion = clamp(Math.round((a.complexion + d * 0.1) * 10) / 10, 0, 1);
    else if (e.kind === 'rasgo') a.rasgos[e.id] = clamp(Math.round((a.rasgos[e.id] + d * 0.1) * 10) / 10, 0, 1);
    else if (e.kind === 'vista') this.vista = (this.vista + d + VISTAS.length) % VISTAS.length;
    else if (e.kind === 'nombre') {
      // (con las flechas, uno de su tiempo)
      const i = NOMBRES.indexOf(a.nombre);
      a.nombre = NOMBRES[(i < 0 ? 0 : i + d + NOMBRES.length) % NOMBRES.length];
      if (this.inp) this.inp.value = a.nombre;
    } else return false;
    this.vestir();
    return true;
  }
  // «Confirmar» sobre una entrada
  activar(e) {
    const g = this.g,
      au = g.audio;
    if (e.kind === 'sub') {
      this.sub = 'rasgos';
      this.sel = 0;
    } else if (e.kind === 'nombre') {
      if (this.inp) {
        // (se ve el campo y, después, se escribe en él)
        this.escribiendo = true;
        g.input.keys.clear();
        this.inp.value = this.a.nombre;
        this.render();
        this.inp.focus();
        this.inp.select();
        au && au.ui('confirm');
        return;
      }
    } else if (e.id === 'azar') {
      const nombre = this.a.nombre;
      this.a = alAzar();
      // (el nombre que se haya escrito, se queda)
      this.a.nombre = nombre;
      this.vestir();
    } else if (e.id === 'listo') {
      this.sub = 'confirmar';
      this.sel = 0;
    } else if (e.id === 'volver' || e.id === 'no') {
      const de = this.sub;
      this.sub = null;
      this.sel = de === 'rasgos' ? 2 : this.entradas().length - 1;
    } else if (e.id === 'si') return this.terminar();
    else if (e.kind === 'lista' || e.kind === 'vista' || e.kind === 'barra' || e.kind === 'rasgo') this.cambiar(e, 1);
    au && au.ui('confirm');
    this.render();
  }

  // ------------------------------------------------------------ pintar
  valor(e, sel) {
    const a = this.a;
    const aL = sel ? spriteHtml(arrowBitmap(-1)) : '',
      aR = sel ? spriteHtml(arrowBitmap(1)) : '';
    const muescas = (v) => {
      const n = Math.round(v * 10);
      let h = '';
      for (let k = 0; k < 10; k++) h += spriteHtml(notchBitmap(k < n));
      return `<span class="notches">${h}</span>`;
    };
    if (e.kind === 'lista') {
      const it = e.list.find((x) => x.id === a[e.id]) || e.list[0];
      return `${aL}<span>${esc(it.nombre)}</span>${aR}`;
    }
    if (e.kind === 'vista') return `${aL}<span>${esc(VISTAS[this.vista].nombre)}</span>${aR}`;
    if (e.kind === 'barra') return `${aL}${muescas(a.complexion)}${aR}`;
    if (e.kind === 'rasgo') return `${aL}${muescas(a.rasgos[e.id])}${aR}`;
    if (e.kind === 'sub') return sel ? spriteHtml(arrowBitmap(1)) : '';
    return '';
  }
  render() {
    const list = $('cr-list');
    if (!list) return;
    const ents = this.entradas();
    this.sel = clamp(this.sel, 0, ents.length - 1);
    // (las filas se rehacen sólo al cambiar de lista: el campo del nombre no
    // pierde lo que se escribe)
    if (this._built !== this.sub) {
      this._built = this.sub;
      list.innerHTML = '';
      this.filas = ents.map((e, i) => {
        const r = document.createElement('div');
        r.className = 'opt k-' + e.kind;
        r.innerHTML = `<span class="lb">${esc(e.label)}</span><span class="v"></span>`;
        r.addEventListener('mousemove', (ev) => {
          if ((ev.movementX || ev.movementY) && this.sel !== i && !this.escribiendo) {
            this.sel = i;
            this.render();
          }
        });
        r.addEventListener('click', (ev) => {
          if (this.cerrando) return;
          this.sel = i;
          const E = this.entradas()[i];
          if (E.kind === 'lista' || E.kind === 'barra' || E.kind === 'rasgo' || E.kind === 'vista') {
            const rect = r.getBoundingClientRect();
            this.cambiar(E, ev.clientX < rect.left + rect.width * 0.72 ? -1 : 1);
            this.g.audio && this.g.audio.ui('move');
            this.render();
          } else this.activar(E);
        });
        list.appendChild(r);
        return r;
      });
      // el campo del nombre, en su fila
      if (!this.sub && this.inp) this.filas[0].querySelector('.v').appendChild(this.inp);
    }
    ents.forEach((e, i) => {
      const r = this.filas[i];
      const sel = i === this.sel;
      r.classList.toggle('sel', sel);
      if (e.kind === 'nombre') {
        r.classList.toggle('escribe', !!this.escribiendo);
        let t = r.querySelector('.nom');
        if (!t) {
          t = document.createElement('span');
          t.className = 'nom';
          r.querySelector('.v').prepend(t);
        }
        t.innerHTML = this.escribiendo ? '' : `${sel ? spriteHtml(arrowBitmap(-1)) : ''}<span>${esc(this.a.nombre)}</span>${sel ? spriteHtml(arrowBitmap(1)) : ''}`;
      } else r.querySelector('.v').innerHTML = this.valor(e, sel);
    });
    const e = ents[this.sel];
    $('cr-sub').textContent = this.sub === 'rasgos' ? 'Rasgos de la cara' : this.sub === 'confirmar' ? '¿Así era?' : '';
    $('cr-desc').textContent = this.escribiendo ? 'Escribe su nombre (Intro para acabar).' : DESC[e.id] || (e.kind === 'rasgo' ? 'De un extremo al otro; en medio, como es su rostro.' : '');
    const k = (a) => this.g.ui.keyHtml(a);
    const pad = this.g.input.device === 'pad';
    const h = [];
    if (!this.escribiendo) {
      h.push(`<span>${k('confirm')} Elegir</span>`);
      h.push(`<span>${spriteHtml(arrowBitmap(-1))}${spriteHtml(arrowBitmap(1))} Cambiar</span>`);
      h.push(`<span>${k('tabL')}${k('tabR')} Girar${pad ? '' : ' (o arrastra)'}</span>`);
      if (this.sub) h.push(`<span>${k('back')} Volver</span>`);
    }
    $('cr-hint').innerHTML = h.join('');
    this.pintarNombre();
  }
  pintarNombre() {
    const el = $('cr-nombre');
    if (el) el.textContent = this.a ? this.a.nombre : '';
  }

  // ------------------------------------------------------------ cada fotograma
  // (lo llama la interfaz mientras la pantalla está abierta: game/ui.js)
  update(s, dt, inp, dir, conf, back) {
    const g = this.g,
      p = g.player;
    if (!this.activo) return;
    // despertando: a negro y fuera
    if (this.cerrando) {
      this.cerrando -= dt;
      this.cerrandoT += dt;
      // (el rótulo: a oscuras, y fuera antes de despertar)
      if (this.rotulo && this._rotulo === 0 && this.cerrandoT >= ROTULO.sale) {
        this._rotulo = 1;
        g.intro.sayAside(this.rotulo);
      } else if (this._rotulo === 1 && this.cerrandoT >= ROTULO.va) {
        this._rotulo = 2;
        g.intro.unsay();
      }
      if (this.cerrando <= 0) this.cerrar(true);
      else this.animar(dt);
      return;
    }
    if (!this.escribiendo) {
      const ents = this.entradas();
      const n = ents.length;
      const au = g.audio;
      if (dir.y) {
        this.sel = (this.sel + dir.y + n) % n;
        au && au.ui('move');
        this.render();
      }
      const e = ents[this.sel];
      if (dir.x && this.cambiar(e, dir.x)) {
        au && au.ui('move');
        this.render();
      } else if (conf) this.activar(e);
      else if (back) {
        if (this.sub) this.activar({ id: this.sub === 'rasgos' ? 'volver' : 'no', kind: 'accion' });
        else if (this.sel !== n - 1) {
          // (en la lista de arriba, «atrás» lleva a despertar)
          this.sel = n - 1;
          au && au.ui('move');
          this.render();
        }
      }
      // girarle
      const gir = (inp.held('tabR') > 0 ? 1 : 0) - (inp.held('tabL') > 0 ? 1 : 0) + (inp.rs ? inp.rs.x : 0);
      this.giro += gir * dt * 2.2;
      if (inp.rs) this.zoom = clamp(this.zoom - inp.rs.y * dt * 1.2, -0.6, 0.6);
      // (si cambió el mando por el teclado o al revés, la ayuda)
      if (this._dev !== inp.device) {
        this._dev = inp.device;
        this.render();
      }
    }
    this.animar(dt);
  }
  // Él, respirando, y la cámara que le encuadra a la derecha del panel
  animar(dt) {
    const g = this.g,
      p = g.player;
    p.yaw = this.giro;
    p.obj.rotation.y = this.giro;
    p.vx = p.vz = 0;
    p.state = 'free';
    p.animate(dt);
    // (el farol, bajo: a dos palmos de la piel la quemaba)
    p.lamp.intensity = 2.6;
    const ents = this.entradas();
    const e = ents[this.sel] || {};
    const want = clamp((CERCA[e.foco || e.id] ?? 0.2) + this.zoom, 0, 1.25);
    this.cerca = damp(this.cerca, want, 4, dt);
    const c = Math.min(1, this.cerca),
      extra = Math.max(0, this.cerca - 1);
    // lo que se mira: de la cintura a la cara; y desde dónde (de lejos, de
    // la cabeza a los pies)
    const ty = STAGE.y + 0.94 + 0.69 * c;
    const dist = 3.6 - 2.62 * c - extra * 0.4;
    const cam = g.camera;
    const fov = 36;
    // (el panel tapa la izquierda: él, hacia la derecha de la pantalla)
    const halfW = Math.tan(((fov / 2) * Math.PI) / 180) * dist * (cam.aspect || 1.7);
    const off = -halfW * 0.3;
    const pos = new THREE.Vector3(STAGE.x + off, ty + 0.06 - 0.1 * c, STAGE.z + dist);
    const look = new THREE.Vector3(STAGE.x + off, ty, STAGE.z);
    g.camRig.override = { pos, look, speed: 1000, fov };
  }
}
