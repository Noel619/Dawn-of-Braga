// Laboratorio de colosos (sólo para pruebas y capturas): construye una de las
// propuestas de jefe final, la coloca en la ciudad o en un estudio neutro y
// prepara la atmósfera de la pelea (menos niebla: hay que ver al gigante).
import * as THREE from 'three';
import { G, colMat } from '../gfx/materials.js';
import { hardGeo } from '../entities/colossus/sculpt.js';

// (rutas resueltas en tiempo de ejecución: los módulos se van añadiendo)
const BUILDERS = {
  turiferario: ['turiferario_col.js', 'buildTuriferarioColossus'],
  deo: ['deo_ignoto.js', 'buildDeoIgnoto'],
  tordo: ['tordo.js', 'buildTordo'],
  masa: ['masa.js', 'buildMasa'],
  procesion: ['procesion.js', 'buildProcesion'],
  se: ['se_viva.js', 'buildSeViva'],
};
const load = ([file, fn]) => import(/* @vite-ignore */ new URL('../entities/colossus/' + file, import.meta.url).href).then((m) => m[fn]);

// atmósferas de la pelea (sustituyen a la de la zona)
export const COL_ATMO = {
  // noche de incendio: niebla rojiza baja, cielo más visible
  fire: { fog: 0x3a2622, density: 0.0125, sky: 0x8a6a62, ground: 0x2a1c18, hemi: 2.15, moon: 1.3, vol: 0.012, ash: 1.2, exposure: 1.14, sat: 0.8, lamp: 9, bloom: 1.15 },
  // ceniza gris azulada (más fría)
  ash: { fog: 0x4a5052, density: 0.0115, sky: 0x9aa4ac, ground: 0x2c2723, hemi: 2.2, moon: 1.1, vol: 0.012, ash: 1.6, exposure: 1.02, sat: 0.7, lamp: 8, bloom: 1.0 },
  // estudio: casi sin niebla
  studio: { fog: 0x2b2624, density: 0.004, sky: 0x8c8278, ground: 0x2a2420, hemi: 2.0, moon: 1.4, vol: 0, ash: 0, exposure: 1.05, sat: 0.85, lamp: 6, bloom: 1.0 },
};

export class ColossusLab {
  constructor(g) {
    this.g = g;
    this.items = [];
    this.t = 0;
  }
  async build(id, o = {}) {
    const fn = await load(BUILDERS[id]);
    const t0 = performance.now();
    const b = fn(o);
    b.ms = Math.round(performance.now() - t0);
    b.id = id;
    this.items.push(b);
    return b;
  }
  place(b, x, y, z, yaw = 0, scene = this.g.scene) {
    b.model.root.position.set(x, y, z);
    b.model.root.rotation.y = yaw;
    scene.add(b.model.root);
    b.model.root.updateMatrixWorld(true);
    b.model.setProbe(0.05, 0.04, 0.035, y, 0.18);
    return b;
  }
  // atmósfera fija para las capturas
  atmo(name, extra = {}) {
    const g = this.g;
    const A = { ...COL_ATMO[name], ...extra };
    const a = g.atmo;
    a.set('city', true);
    a.override = A;
    Object.assign(a.cur, A);
    a.fogC.set(A.fog);
    a.skyC.set(A.sky);
    a.groundC.set(A.ground);
    const orig = a._origUpdate || (a._origUpdate = a.update.bind(a));
    a.update = (dt, p) => {
      a.target = { ...A };
      orig(dt, p);
      if (A.far) {
        g.camera.far = A.far;
        g.camera.updateProjectionMatrix();
      }
      if (A.skyGlow !== undefined) G.uSkyGlow.value = A.skyGlow;
      else G.uSkyGlow.value = 1;
    };
    a.update(1, g.player);
  }
  // Quita del mundo lo que cae dentro de la caja (sólo para las capturas: la
  // nave de la catedral reventada por el dios): triángulos de la geometría
  // estática, fuegos, luces y haces de luz.
  cutWorld(x0, y0, z0, x1, y1, z1) {
    const g = this.g;
    const inBox = (x, y, z) => x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1;
    let removed = 0;
    for (const m of g.scene.children) {
      if (!m.isMesh || !m.geometry || !m.geometry.index || m.userData.colossus) continue;
      const geo = m.geometry;
      const P = geo.attributes.position;
      const I = geo.index.array;
      const keep = [];
      for (let i = 0; i < I.length; i += 3) {
        const a = I[i],
          b = I[i + 1],
          c = I[i + 2];
        const cx = (P.getX(a) + P.getX(b) + P.getX(c)) / 3,
          cy = (P.getY(a) + P.getY(b) + P.getY(c)) / 3,
          cz = (P.getZ(a) + P.getZ(b) + P.getZ(c)) / 3;
        if (inBox(cx, cy, cz)) removed++;
        else keep.push(a, b, c);
      }
      if (keep.length !== I.length) geo.setIndex(P.count > 65535 ? new THREE.Uint32BufferAttribute(keep, 1) : new THREE.Uint16BufferAttribute(keep, 1));
    }
    // lo que no es geometría indexada (agua, sprites...): fuera si su centro cae dentro
    const v = new THREE.Vector3();
    g.scene.traverse((o) => {
      // (el agua del río: un plano enorme con su propio shader)
      if (o.isMesh && o.material && o.material.isShaderMaterial && o.geometry && o.geometry.boundingSphere) {
        v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
        if (inBox(v.x, v.y, v.z)) o.visible = false;
      }
      if (!o.isMesh || o.userData.colossus || (o.geometry && o.geometry.index)) return;
      if (!o.geometry || !o.geometry.boundingSphere) o.geometry && o.geometry.computeBoundingSphere();
      if (!o.geometry || !o.geometry.boundingSphere) return;
      v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
      if (inBox(v.x, v.y, v.z) && o.geometry.boundingSphere.radius < 400) o.visible = false;
    });
    for (const f of g.fx.fires.list) if (inBox(f.x, f.y, f.z)) f.on = false;
    for (const s of g.fx.lights.sources) if (inBox(s.x, s.y, s.z)) s.on = false;
    for (const m of g.scene.children) if (m.renderOrder === 7 && m.material && m.material.blending === THREE.AdditiveBlending) m.visible = false;
    return removed;
  }
  tick(dt) {
    this.t += dt;
    for (const b of this.items) if (b.fx) b.fx.update(this.g.time);
  }
  // estudio: suelo de losas, sin ciudad, luz de luna y contraluz cálido
  studio() {
    if (this.studioScene) return this.studioScene;
    const g = this.g;
    const s = new THREE.Scene();
    s.fog = g.scene.fog;
    s.background = g.scene.background;
    s.add(new THREE.HemisphereLight(0x9a8c84, 0x2a2420, 1.7));
    const key = new THREE.DirectionalLight(0xb8c4dc, 1.25);
    key.position.set(-30, 50, 40);
    s.add(key);
    const rim = new THREE.DirectionalLight(0xff9050, 1.0);
    rim.position.set(25, 18, -45);
    s.add(rim);
    const geo = hardGeo({ type: 'cyl', s: [70, 70, 0.4], seg: 40, p: [0, -0.2, 0], mat: 'flag', uvk: 90, ao: false });
    const ground = new THREE.Mesh(geo, colMat('flag'));
    s.add(ground);
    this.studioScene = s;
    return s;
  }
  // dibuja el estudio con el mismo postproceso del juego
  renderStudio() {
    const g = this.g;
    g.post.render(this.studio(), g.camera, g.time);
  }
}
