// El monolito para las láminas: se monta el de verdad (el que tuvo el juego,
// archive/monolito/idol_monolith_geo.js) y se le saca con three.js lo que el
// grabado necesita, visto con la cámara de la lámina: su silueta, el tono a
// la luz que diga la lámina (para el estudio de valores) y lo que arde (las
// bocas, los ojos, la grieta, el ojo grande). Con o.golden, en la punta del
// brazo grande, la mano de oro (antes de que Martín se la cortara).
//
// La cámara de las láminas: un ojo en (0, HC, 0) que mira hacia +Z, con la
// focal F (px) y el centro en (CX, HY): un punto (X, Y, Z) cae en
// (CX + F X / Z, HY - F (Y - HC) / Z).
import * as THREE from 'three';
import { monolithData, MONO, spine } from '../../archive/monolito/idol_monolith_geo.js';
import { hand } from '../../src/entities/sculpt.js';

let DATA = null;
const data = () => DATA || (DATA = monolithData(1667, {}));

// o: { W, H, F, CX, HY, HC, at: [X, Z] (el pie del monolito), yaw (giro, en
// radianes: 0, de frente; negativo, con la cara hacia la izquierda de la
// lámina), open (el ojo: 0..1), cry (almas que gritan),
// golden (con handK: 0, sólo el aro: la mano la dibuja la lámina), lights:
// [{ p: [X, Y, Z], color, k, range }], hemi: [cielo, suelo, k] }
export function renderMonolith(o) {
  const d = data();
  const { W, H } = o;
  const V3 = THREE.Vector3;
  const root = new THREE.Group();
  // (de la lámina a three: z hacia dentro de la lámina es -z)
  root.position.set(o.at[0], 0, -o.at[1]);
  root.rotation.y = o.yaw || 0;
  const open = o.open ?? 0;
  const cry = new Set(o.cry || []);
  // una malla de la piedra: el color de sus vértices, los párpados como
  // diga open y el empuje de las que gritan; glow: lo que arde (0..1)
  const stone = (a) => {
    const g = new THREE.BufferGeometry();
    const pos = a.position.slice(),
      nrm = a.normal;
    const n = pos.length / 3;
    const glow = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const sw = a.aSway,
        so = a.aSoul;
      let off = 0;
      if (sw && sw[i * 4 + 3] < -0.5) off += sw[i * 4] + (sw[i * 4 + 1] - sw[i * 4]) * open;
      const sc = so && so[i * 4 + 2] >= 0 && cry.has(Math.round(so[i * 4 + 2])) ? 1 : 0;
      if (so) off += so[i * 4] * 0.075 * sc;
      pos[i * 3] += nrm[i * 3] * off;
      pos[i * 3 + 1] += nrm[i * 3 + 1] * off;
      pos[i * 3 + 2] += nrm[i * 3 + 2] * off;
      const gw = so ? so[i * 4 + 1] * (0.35 + 1.6 * sc) : 0;
      glow[i * 3] = glow[i * 3 + 1] = glow[i * 3 + 2] = Math.min(1, gw);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    const k = o.contrast ?? 1;
    const col = a.color.map((c) => Math.pow(c / 1.4, k) * 1.4);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (a.index) g.setIndex(new THREE.BufferAttribute(a.index, 1));
    g.userData.glow = glow;
    return g;
  };
  const plain = (a) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(a.normal, 3));
    return g;
  };
  const parts = [];
  parts.push({ g: stone(d.body), kind: 'stone' });
  parts.push({ g: stone(d.arms), kind: 'stone' });
  parts.push({ g: plain(d.band), kind: 'iron' });
  parts.push({ g: plain(d.studs), kind: 'iron' });
  // el ojo: lo de dentro, que mira a la cámara
  {
    const c = new V3(...d.eye.c),
      nE = new V3(...d.eye.n);
    const ball = new THREE.SphereGeometry(MONO.eyeR, 32, 24);
    ball.translate(c.x, c.y, c.z);
    parts.push({ g: ball, kind: 'eye' });
    const iris = new THREE.SphereGeometry(MONO.eyeR * 1.01, 32, 12, 0, Math.PI * 2, 0, 0.5);
    iris.rotateX(Math.PI / 2);
    iris.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), nE));
    iris.translate(c.x, c.y, c.z);
    parts.push({ g: iris, kind: 'iris' });
  }
  // el muñón, o la mano de oro
  {
    const wr = new V3(...d.stump);
    const D = new V3(...d.stumpDir);
    if (o.golden && o.handK === 0) parts.push({ g: plain(d.gold), kind: 'gold' });
    else if (o.golden) {
      // (la mano cuelga de la muñeca: hacia donde diga handDir)
      const Dh = o.handDir ? new V3(...o.handDir).normalize() : D;
      const h = hand({ side: 1, k: o.handK ?? 3.1, curl: 0.25, spread: 3.0, claw: 0.5, len: 1.2, thick: 0.85, thumb: 1 });
      // (el dorso, hacia quien mira la lámina: los dedos se doblan hacia
      // dentro, como una garra, y se ven todos)
      root.updateMatrixWorld(true);
      const camL = root.worldToLocal(new V3(0, o.HC, 0));
      const pn = wr.clone().sub(camL).normalize();
      pn.sub(Dh.clone().multiplyScalar(pn.dot(Dh))).normalize();
      const X = pn.clone().negate(),
        Yv = Dh.clone().negate(),
        Z = new V3().crossVectors(X, Yv);
      h.applyMatrix4(new THREE.Matrix4().makeBasis(X, Yv, Z).setPosition(wr.clone().add(Dh.clone().multiplyScalar(0.02))));
      parts.push({ g: h, kind: 'gold' });
      parts.push({ g: plain(d.gold), kind: 'gold' });
    } else {
      parts.push({ g: plain(d.gold), kind: 'gold' });
      parts.push({ g: plain(d.cut), kind: 'cut' });
    }
  }
  const scene = new THREE.Scene();
  scene.add(root);
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(0, o.HC, 0);
  cam.updateMatrixWorld();
  const near = 0.1,
    far = 100;
  cam.projectionMatrix.makePerspective((-o.CX / o.F) * near, ((W - o.CX) / o.F) * near, (o.HY / o.F) * near, (-(H - o.HY) / o.F) * near, near, far);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  const rr = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  rr.setPixelRatio(1);
  rr.setSize(W, H, false);
  rr.setClearColor(0x000000, 0);
  const read = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    x.drawImage(rr.domElement, 0, 0);
    return x.getImageData(0, 0, W, H).data;
  };
  const meshes = [];
  const use = (matFn) => {
    for (const m of meshes) root.remove(m);
    meshes.length = 0;
    for (const p of parts) {
      const mat = matFn(p);
      if (!mat) continue;
      const m = new THREE.Mesh(p.g, mat);
      root.add(m);
      meshes.push(m);
    }
  };
  // ------------------------------------------ el tono
  const lights = new THREE.Group();
  for (const L of o.lights || []) {
    const l = new THREE.PointLight(L.color ?? 0xffffff, L.k ?? 20, L.range ?? 0, L.decay ?? 1.4);
    l.position.set(L.p[0], L.p[1], -L.p[2]);
    lights.add(l);
  }
  const hm = o.hemi || [0x806060, 0x201010, 0.4];
  lights.add(new THREE.HemisphereLight(hm[0], hm[1], hm[2]));
  scene.add(lights);
  use((p) =>
    p.kind === 'stone'
      ? new THREE.MeshLambertMaterial({ vertexColors: true })
      : p.kind === 'iron'
        ? new THREE.MeshLambertMaterial({ color: 0x3a2a24 })
        : p.kind === 'gold'
          ? new THREE.MeshPhongMaterial({ color: 0xc89a48, specular: 0xffe0a0, shininess: 40 })
          : p.kind === 'eye'
            ? new THREE.MeshPhongMaterial({ color: 0x3a0806, specular: 0xffffff, shininess: 80 })
            : new THREE.MeshBasicMaterial({ color: p.kind === 'iris' ? 0xff7a30 : 0xff3a18 })
  );
  rr.render(scene, cam);
  const A = read();
  scene.remove(lights);
  // ------------------------------------------ lo que arde
  use((p) => {
    if (p.kind === 'stone') {
      const g = p.g.clone();
      g.setAttribute('color', new THREE.BufferAttribute(p.g.userData.glow, 3));
      p.gg = g;
      return new THREE.MeshBasicMaterial({ vertexColors: true });
    }
    return new THREE.MeshBasicMaterial({ color: p.kind === 'iris' || p.kind === 'cut' ? 0xffffff : 0x000000 });
  });
  for (const m of meshes) if (m.geometry.userData.glow) m.geometry = parts.find((p) => p.g === m.geometry).gg;
  rr.render(scene, cam);
  const B = read();
  // ------------------------------------------ el color propio (sin luz)
  use((p) => (p.kind === 'stone' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : new THREE.MeshBasicMaterial({ color: 0x000000 })));
  rr.render(scene, cam);
  const Al = read();
  // ------------------------------------------ dónde está cada cosa (la piedra, el hierro, el oro...)
  // (sin pasar por sRGB: el rojo es el número de la pieza)
  const KIND = { stone: 1, iron: 2, gold: 3, eye: 4, iris: 4, cut: 5 };
  use((p) => new THREE.MeshBasicMaterial({ color: new THREE.Color(KIND[p.kind] / 8, 0, 0) }));
  rr.outputColorSpace = THREE.LinearSRGBColorSpace;
  rr.render(scene, cam);
  const C = read();
  rr.dispose();
  const n = W * H;
  const lum = new Float32Array(n),
    alpha = new Float32Array(n),
    glow = new Float32Array(n),
    alb = new Float32Array(n),
    kind = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = A[i * 4 + 3] / 255;
    alpha[i] = a;
    lum[i] = (0.3 * A[i * 4] + 0.55 * A[i * 4 + 1] + 0.15 * A[i * 4 + 2]) / 255;
    glow[i] = B[i * 4 + 3] > 2 ? B[i * 4] / 255 : 0;
    alb[i] = Al[i * 4 + 3] > 2 ? Al[i * 4] / 255 : 0;
    kind[i] = C[i * 4 + 3] > 128 ? Math.round((C[i * 4] / 255) * 8) : 0;
  }
  // dónde cae en la lámina un punto del monolito (en su espacio)
  const proj = (p) => {
    const v = new V3(...p).applyMatrix4(root.matrixWorld);
    const Z = -v.z;
    return [o.CX + (o.F * v.x) / Z, o.HY - (o.F * (v.y - o.HC)) / Z];
  };
  root.updateMatrixWorld(true);
  return { lum, alpha, glow, alb, kind, proj, data: d, eyeC: proj(d.eye.c), stump: proj(d.stump), spineTop: proj([spine(MONO.rim)[0], MONO.rim, spine(MONO.rim)[1]]) };
}
