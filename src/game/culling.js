// Ocultar lo que no se ve (sólo para dibujar: la colisión, la IA y el sonido
// no se enteran). Cada fotograma:
//  - lo que está entero bajo la calle (la cripta, las bodegas, las
//    mazmorras) con la cámara arriba: la losa de tierra de la calle lo tapa
//    todo salvo sus huecos (las escaleras, el cráter, el río), así que sólo
//    hace falta si alguno está a la vista (en el encuadre, más acá de donde
//    la niebla lo tapa todo y sin un muro en medio) o la cámara está junto a
//    él. Eso va al final de las mallas del mundo (gfx/geo.js), y se deja de
//    dibujar acortándolas, o en mallas suyas, en una capa que la cámara
//    enciende o apaga. (Al revés no: las bóvedas de muchas salas de abajo
//    suben casi hasta la calle);
//  - las criaturas y los objetos de muchas piezas (rejas, puentes, puertas)
//    que tapa un muro.
// En la introducción, el título, las cinemáticas y la película del jefe
// final, todo a la vista: la cámara va a donde quiere.
import * as THREE from 'three';

const _fr = new THREE.Frustum(),
  _m = new THREE.Matrix4(),
  _box = new THREE.Box3(),
  _v = new THREE.Vector3();

// lo que tapa la vista: muros (más de 2,4 m de alto: un carro volcado o un
// puesto, con su caja de colisión entera, no tapan del todo) y el suelo de la
// calle; no los forjados (hay rellanos y huecos de escalera que no tapan del
// todo), ni los muros invisibles de las zonas que no se pisan, ni puertas
// (hay rejas), ni niebla, ni lo que sólo frena la cámara
const opaque = (b) => !(b.camOnly || b.noSight || b.tag === 'block' || b.tag === 'door' || b.tag === 'fog') && (b.tag === 'floor' || b.maxy - b.miny > 2.4);

export class Culling {
  constructor(game) {
    this.g = game;
    const cam = game.camera;
    // (las mallas del subsuelo, en la capa 1; las que lo llevan al final, a
    // acortar)
    this.cut = [];
    for (const m of game.level.meshes) {
      if (m.userData.layer === 'sub') m.layers.set(1);
      if (m.userData.subStart !== undefined) this.cut.push(m);
    }
    this.cutting = false;
    cam.layers.enable(1);
    this.portals = (game.level.ctx.portals || []).map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1, box: new THREE.Box3(new THREE.Vector3(x0, -0.8, z0), new THREE.Vector3(x1, 0.6, z1)) }));
    this.hidden = [];
    this.heavy = null;
    this.on = true;
    // (para medir: si se dibuja el subsuelo y cuántos objetos se han quitado)
    this.stats = { sub: true, hidden: 0 };
  }

  // ¿Se ve el punto desde la cámara? (lo que tapa: opaque; el rayo, a trozos
  // de 8 m, que solapan un poco: así cada consulta de cajas es pequeña, y lo
  // normal es que lo tape algo cerca)
  see(c, x, y, z) {
    const dx = x - c.x,
      dy = y - c.y,
      dz = z - c.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.5) return true;
    const ux = dx / d,
      uy = dy / d,
      uz = dz / d,
      end = d - 0.25,
      col = this.g.world.col;
    for (let t = 0; t < end; t += 8)
      if (col.raycast(c.x + ux * t, c.y + uy * t, c.z + uz * t, ux, uy, uz, Math.min(8.05, end - t), opaque) !== Infinity) return false;
    return true;
  }

  // Antes de dibujar: qué capas y qué se esconde.
  begin() {
    const g = this.g,
      cam = g.camera,
      c = cam.position;
    const free = !this.on || (g.state !== 'play' && g.state !== 'paused') || !!g.cutscene || !!(g.finale && g.finale.filmActive);
    let sub = true;
    if (!free && c.y > 0) {
      _m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      _fr.setFromProjectionMatrix(_m);
      // (hasta donde la niebla deja ver algo: 1 - exp(-(densidad·d)²) llega
      // ahí al 99 %)
      const reach = Math.min(cam.far, 2.2 / Math.max(0.005, g.scene.fog ? g.scene.fog.density : 0));
      let open = false;
      for (const p of this.portals) {
        const d = Math.hypot(Math.max(p.x0 - c.x, 0, c.x - p.x1), Math.max(p.z0 - c.z, 0, c.z - p.z1));
        if (d < 5) open = true;
        else if (d < reach && _fr.intersectsBox(p.box)) {
          // (sin un muro en medio: el punto del hueco más cercano, el centro
          // o una esquina)
          const ix = Math.min(0.3, (p.x1 - p.x0) / 4),
            iz = Math.min(0.3, (p.z1 - p.z0) / 4);
          open =
            this.see(c, Math.min(Math.max(c.x, p.x0 + ix), p.x1 - ix), 0.4, Math.min(Math.max(c.z, p.z0 + iz), p.z1 - iz)) ||
            this.see(c, (p.x0 + p.x1) / 2, 0.4, (p.z0 + p.z1) / 2) ||
            this.see(c, p.x0 + ix, 0.4, p.z0 + iz) ||
            this.see(c, p.x1 - ix, 0.4, p.z0 + iz) ||
            this.see(c, p.x0 + ix, 0.4, p.z1 - iz) ||
            this.see(c, p.x1 - ix, 0.4, p.z1 - iz);
        }
        if (open) break;
      }
      sub = open;
    }
    if (sub) cam.layers.enable(1);
    else cam.layers.disable(1);
    if (!sub) for (const m of this.cut) m.geometry.drawRange.count = m.userData.subStart;
    this.cutting = !sub;
    this.stats.sub = sub;

    // criaturas y objetos de muchas piezas
    this.hidden.length = 0;
    if (!free) {
      const now = g.time;
      // (más allá del plano lejano no se dibuja nada: ni se mira)
      const far = cam.far;
      for (const e of g.enemies) {
        const o = e.obj;
        if (!o.visible || e.boss || e.scripted || e === g.lockTarget || e === g.activeBoss) continue;
        const d = c.distanceTo(e.pos);
        let vis = d < 7;
        if (!vis && d < far) {
          const k = e._cull || (e._cull = { next: 0, seen: -9 });
          if (now >= k.next || now < k.next - 1) {
            k.next = now + 0.1 + Math.random() * 0.08;
            const h = e.T.height || 1.8;
            // (por encima de la cabeza, el pecho, los pies y los costados)
            _v.set(e.pos.z - c.z, 0, c.x - e.pos.x).normalize().multiplyScalar(0.45);
            if (
              this.see(c, e.pos.x, e.pos.y + h + 0.15, e.pos.z) ||
              this.see(c, e.pos.x, e.pos.y + h * 0.55, e.pos.z) ||
              this.see(c, e.pos.x, e.pos.y + 0.3, e.pos.z) ||
              this.see(c, e.pos.x + _v.x, e.pos.y + h * 0.55, e.pos.z + _v.z) ||
              this.see(c, e.pos.x - _v.x, e.pos.y + h * 0.55, e.pos.z - _v.z)
            )
              k.seen = now;
          }
          // (un rato más a la vista tras perderla: sin parpadeos en las esquinas)
          vis = now - k.seen < 0.4;
        }
        if (!vis) this.hide(o, e.shadow);
      }
      for (const q of this.heavyList()) {
        if (!q.obj.visible || !q.obj.parent) continue;
        if (now >= q.next || now < q.next - 3) {
          q.next = now + 0.15 + Math.random() * 0.1;
          if (now >= q.boxT || now < q.boxT - 3) {
            q.boxT = now + 1.5;
            q.box.setFromObject(q.obj);
          }
          const b = q.box;
          const d = b.distanceToPoint(c);
          if (d < 4) q.seen = now;
          else if (d < far) {
            // (el centro y las esquinas, con un margen: lo que asoma por
            // encima de un muro, rozándolo, también cuenta)
            const yc = (b.min.y + b.max.y) / 2,
              x0 = b.min.x - 0.3,
              x1 = b.max.x + 0.3,
              z0 = b.min.z - 0.3,
              z1 = b.max.z + 0.3,
              yt = b.max.y + 0.3;
            if (
              this.see(c, (b.min.x + b.max.x) / 2, yc, (b.min.z + b.max.z) / 2) ||
              this.see(c, x0, yt, z0) ||
              this.see(c, x1, yt, z0) ||
              this.see(c, x0, yt, z1) ||
              this.see(c, x1, yt, z1) ||
              this.see(c, x0, b.min.y + 0.3, z0) ||
              this.see(c, x1, b.min.y + 0.3, z1)
            )
              q.seen = now;
          }
        }
        if (now - q.seen >= 0.5) this.hide(q.obj);
      }
    }
    this.stats.hidden = this.hidden.length;
  }

  hide(...objs) {
    for (const o of objs)
      if (o && o.visible) {
        o.visible = false;
        this.hidden.push(o);
      }
  }

  // Después de dibujar: lo escondido vuelve a estar como estaba.
  end() {
    for (const o of this.hidden) o.visible = true;
    this.hidden.length = 0;
    if (this.cutting) for (const m of this.cut) m.geometry.drawRange.count = Infinity;
    this.cutting = false;
  }

  // Los objetos de muchas piezas (diez mallas o más, de menos de 12 m): las
  // rejas, los puentes, las puertas de dos hojas... (no las criaturas, ni el
  // jugador, ni el mundo, ni lo grande: la estatua, el gigante)
  heavyList() {
    if (this.heavy) return this.heavy;
    const g = this.g;
    const skip = new Set([g.player.obj, ...g.enemies.map((e) => e.obj)]);
    this.heavy = [];
    for (const o of g.scene.children) {
      if (skip.has(o) || o.userData.bucket || o.userData.noCull || !(o.isGroup || o.type === 'Object3D')) continue;
      let n = 0;
      o.traverse((q) => q.isMesh && n++);
      if (n < 10) continue;
      _box.setFromObject(o);
      if (_box.isEmpty() || _box.getSize(_v).length() > 12) continue;
      this.heavy.push({ obj: o, box: _box.clone(), boxT: 0, next: 0, seen: -9 });
    }
    return this.heavy;
  }
}
