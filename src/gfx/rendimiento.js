// Rendimiento: lo que three.js hace en cada fotograma sin que haga falta.
//
// Matrices. three.js recompone la matriz de cada objeto (posición, giro y
// escala) y la multiplica por la de su padre en cada fotograma, se haya
// movido o no: con la ciudad entera y las criaturas de toda Braga en la
// escena (unos 19 000 objetos, de los que se mueven unos 300), eso era casi la
// mitad de lo que gastaba la CPU en cada fotograma. Aquí cada objeto apunta
// con qué posición, giro y escala compuso su matriz, y con qué versión de la
// matriz de su padre calculó la suya: si nada de eso ha cambiado, la matriz
// que tiene es la que saldría, y no se vuelve a calcular. Lo que se mueve se
// calcula igual que antes, con las mismas operaciones, y da los mismos números.
//  - matrixAutoUpdate: se recompone si cambian la posición, el cuaternión, la
//    escala o hay pivote (como antes, cada vez);
//  - matrixWorldNeedsUpdate, force: como antes;
//  - y además, si la matriz del padre es otra (se movió, se cambió de padre,
//    se le colgó a otro): cada vez que un objeto calcula su matriz del mundo
//    se lleva un número nuevo, y el hijo recuerda el que tenía su padre.
// (Quien escribe la matriz a mano —las losas que bajan, lo que se derrumba en
// la película— lo hace con matrixAutoUpdate en false y avisa con
// matrixWorldNeedsUpdate, como pide three.js: sigue funcionando igual.)
import * as THREE from 'three';
import { soltarArray } from '../core/util.js';

let _ver = 1;
const proto = THREE.Object3D.prototype;

// ¿Hay que recomponer la matriz local? Si sí, la recompone (con el
// updateMatrix de siempre, que también marca matrixWorldNeedsUpdate) y
// apunta con qué valores.
function local(o) {
  const p = o.position,
    q = o.quaternion,
    s = o.scale;
  let c = o._mc;
  if (c !== undefined && o.pivot == null && c[0] === p.x && c[1] === p.y && c[2] === p.z && c[3] === q._x && c[4] === q._y && c[5] === q._z && c[6] === q._w && c[7] === s.x && c[8] === s.y && c[9] === s.z) return;
  o.updateMatrix();
  if (c === undefined) c = o._mc = new Float64Array(10);
  c[0] = p.x;
  c[1] = p.y;
  c[2] = p.z;
  c[3] = q._x;
  c[4] = q._y;
  c[5] = q._z;
  c[6] = q._w;
  c[7] = s.x;
  c[8] = s.y;
  c[9] = s.z;
}

function world(o, parent) {
  if (o.matrixWorldAutoUpdate === true) {
    if (parent === null) o.matrixWorld.copy(o.matrix);
    else o.matrixWorld.multiplyMatrices(parent.matrixWorld, o.matrix);
  }
  o.matrixWorldNeedsUpdate = false;
  o._mwv = ++_ver;
  o._mwpv = parent === null ? 0 : parent._mwv;
}

proto.updateMatrixWorld = function (force) {
  if (this.matrixAutoUpdate) local(this);
  const parent = this.parent;
  if (this.matrixWorldNeedsUpdate || force || this._mwv === undefined || (parent === null ? this._mwpv !== 0 : parent._mwv !== this._mwpv)) {
    world(this, parent);
    force = true;
  }
  const children = this.children;
  for (let i = 0, l = children.length; i < l; i++) children[i].updateMatrixWorld(force);
};

// Descarte por el encuadre (frustum). Para cada malla, three.js lleva cada
// fotograma su esfera envolvente al mundo (con su matriz) antes de mirar si
// cae dentro: de las trece mil mallas de la escena casi ninguna se ha movido.
// Se guarda la esfera del mundo con la versión de la matriz con la que se
// calculó (y la esfera de la geometría, por si cambia): si nada ha cambiado,
// es la misma, y la prueba da lo mismo.
const _sph = new THREE.Sphere();
const intersectsObject0 = THREE.Frustum.prototype.intersectsObject;
THREE.Frustum.prototype.intersectsObject = function (object) {
  const v = object._mwv;
  if (object.boundingSphere !== undefined || v === undefined) return intersectsObject0.call(this, object);
  const geometry = object.geometry;
  if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
  const bs = geometry.boundingSphere,
    c = bs.center,
    te = object.matrixWorld.elements;
  let f = object._fs;
  // (y, por si acaso, dónde está: la traslación de la matriz del mundo)
  if (f === undefined || f[0] !== v || f[1] !== c.x || f[2] !== c.y || f[3] !== c.z || f[4] !== bs.radius || f[9] !== te[12] || f[10] !== te[13] || f[11] !== te[14]) {
    _sph.copy(bs).applyMatrix4(object.matrixWorld);
    if (f === undefined) f = object._fs = new Float64Array(12);
    f[0] = v;
    f[1] = c.x;
    f[2] = c.y;
    f[3] = c.z;
    f[4] = bs.radius;
    f[5] = _sph.center.x;
    f[6] = _sph.center.y;
    f[7] = _sph.center.z;
    f[8] = _sph.radius;
    f[9] = te[12];
    f[10] = te[13];
    f[11] = te[14];
  } else {
    _sph.center.set(f[5], f[6], f[7]);
    _sph.radius = f[8];
  }
  return this.intersectsSphere(_sph);
};

proto.updateWorldMatrix = function (updateParents, updateChildren, force = false) {
  const parent = this.parent;
  if (updateParents === true && parent !== null) parent.updateWorldMatrix(true, false);
  if (this.matrixAutoUpdate) local(this);
  if (this.matrixWorldNeedsUpdate || force || this._mwv === undefined || (parent === null ? this._mwpv !== 0 : parent._mwv !== this._mwpv)) {
    world(this, parent);
    force = true;
  }
  if (updateChildren === true) {
    const children = this.children;
    for (let i = 0, l = children.length; i < l; i++) children[i].updateWorldMatrix(false, true, force);
  }
};

// Antes de jugar, con la pantalla de carga delante, lo que la GPU va a
// necesitar, ya en ella:
//  - los shaders de todo lo que hay en la escena, compilados para donde se
//    dibuja de verdad: el destino intermedio del posproceso, en lineal (los
//    de la pantalla, en sRGB, no se usan nunca); si no, cada material que
//    aparecía por primera vez se compilaba en mitad de la partida (un tirón);
//  - la geometría del mundo, subida de una vez (antes, la primera vez que se
//    veía cada trozo: otro tirón al asomarse a una zona nueva);
//  - y, con poca memoria (soltar: el teléfono, la tableta), sin su copia en la
//    memoria de la página, unos 280 MB que la GPU ya tiene: el sistema cerraba
//    la pestaña (y Safari la recarga sin decir nada). De lo que tiene grupo se
//    quedan la posición y los índices (lo que se derrumba en la película los
//    lee). Sin esa copia, si el sistema le quita el contexto de WebGL a la
//    página no se puede rehacer: entonces se recarga (la partida, desde lo
//    guardado; main.js).
// (Y no basta con quitarle el array al atributo: esa memoria sólo vuelve
// cuando pasa el recolector, que puede tardar; con el dato ya en la GPU, se
// suelta en el acto: core/util.js, soltarArray.)
export function prepararGPU(game, soltar) {
  const R = game.renderer,
    scene = game.scene,
    cam = game.camera,
    M = game.level.meshes;
  if (soltar) {
    const libre = function () {
      const a = this.array;
      this.array = null;
      soltarArray(a);
    };
    for (const m of M) {
      const G = m.geometry,
        grp = !!(m.userData.group || m.userData.groups);
      for (const k in G.attributes) if (!(grp && k === 'position')) G.attributes[k].onUpload(libre);
      if (G.index && !grp) G.index.onUpload(libre);
    }
  }
  const prev = R.getRenderTarget();
  const rt = new THREE.WebGLRenderTarget(4, 4);
  const fc = M.map((m) => m.frustumCulled);
  const mask = cam.layers.mask;
  // (pase lo que pase, todo vuelve a como estaba: si no, se dibujaría en el
  // destino de 4×4, con la pantalla en negro)
  try {
    R.setRenderTarget(rt);
    R.compile(scene, cam);
    // (todo el mundo a la vista una vez: sin descarte por el encuadre y con el
    // subsuelo; lo oculto, cuando se muestre)
    for (const m of M) m.frustumCulled = false;
    cam.layers.enable(1);
    R.render(scene, cam);
  } finally {
    cam.layers.mask = mask;
    M.forEach((m, i) => (m.frustumCulled = fc[i]));
    R.setRenderTarget(prev);
    rt.dispose();
  }
}
