// Lo que se mueve en la cloaca (world/cloaca.js y world/vergel.js):
//  - las cascadas: la que cae de la boca del conducto, bajo el rellano, a la
//    alberca de la sala de la luz; la del saliente del Vergel, que cae a la
//    poza; y el chorro del caño de la fuente. Cada una, una cortina de agua
//    con sus hilos que bajan, que se abre al caer, y la espuma al pie; y el
//    agua de abajo, que no para de revolverse donde cae;
//  - las luciérnagas del Vergel, por encima del prado y del agua (se mueven y
//    se encienden en el sombreador: aquí sólo se ponen);
//  - los ojos de lo oscuro: si te acercas a la raya de candiles y miras hacia
//    el paso, alguna vez, un instante, se encienden dos ojos al fondo, a más
//    altura que los de un hombre, y se oye un gruñido. Luego, nada.
import * as THREE from 'three';
import { G, objMat } from '../gfx/materials.js';
import { CLOACA } from '../world/cloaca.js';
import { VERGEL } from '../world/vergel.js';

const FOG_CHUNK = `
  float fog = 1.0 - exp(-fogDensity * fogDensity * vDist * vDist);`;

export class CloacaFX {
  constructor(g) {
    this.g = g;
    const C = CLOACA.cascada,
      F = VERGEL.fuente,
      Rl = VERGEL.rellano,
      Pi = VERGEL.pila,
      Rg = VERGEL.reguero;
    // (c: el centro del labio; w: su ancho; d: hacia dónde sale el agua;
    // out: lo que se adelanta al caer; open: lo que se abre; foam: el radio
    // de la espuma; k: lo que revuelve el agua de abajo)
    this.cas = [
      { c: [(C.x0 + C.x1) / 2, C.z], w: C.x1 - C.x0, y0: C.y0, y1: C.y1, d: [0, 1], out: 0.42, open: 0.35, foam: 0.95, k: 1 },
      // (la del rellano del Vergel: de su canal a la alberca)
      { c: [Rl[2], VERGEL.boca.z], w: 0.95, y0: VERGEL.boca.y - 0.19, y1: VERGEL.agua, d: [1, 0], out: 0.5, open: 0.4, foam: 1.0, k: 1 },
      // (el caño de la fuente, a su pila; y la pila, que rebosa al reguero)
      { c: [F.x - 0.42, F.z], w: 0.12, y0: F.y - 0.03, y1: VERGEL.y + 0.5, d: [-1, 0], out: 0.25, open: 0.8, foam: 0.3, k: 0.4 },
      { c: [Pi[0], (Rg[1] + Rg[3]) / 2], w: Rg[3] - Rg[1] - 0.1, y0: VERGEL.y + 0.48, y1: VERGEL.agua, d: [-1, 0], out: 0.18, open: 0.2, foam: 0.4, k: 0.4 },
    ];
    // (y las de las cloacas hondas: los caños, los sumideros, el Sumidero;
    // luz: la del sitio, de 0 a 1; las de aquí, a la luz)
    for (const c of this.cas) c.luz = 1;
    this.cas.push(...(g.level.ctx.cascadas || []));
    for (const c of this.cas) c.rip = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, uLamp: { value: new THREE.Vector3(0, -99, 0) }, uLampK: { value: 0 } },
      vertexShader: `
        attribute float aLuz;
        uniform vec3 uLamp; uniform float uLampK;
        varying vec2 vUv; varying float vDist; varying float vLuz;
        void main(){
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec4 mv = viewMatrix * wp;
          vDist = -mv.z;
          // (la luz del sitio y la del farol, si está cerca)
          float ld = length(uLamp - wp.xyz);
          vLuz = aLuz + uLampK * 1.1 / (1.0 + ld * ld * 0.18);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 fogColor; uniform float fogDensity;
        varying vec2 vUv; varying float vDist; varying float vLuz;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          // los hilos: bandas a lo ancho que bajan deprisa, rotas por el ruido
          float u = vUv.x, v = vUv.y;
          float s = n(vec2(u * 26.0, v * 3.0 + uTime * 3.4)) * 0.6 + n(vec2(u * 61.0, v * 7.0 + uTime * 5.1)) * 0.4;
          float hilos = smoothstep(0.35, 0.95, s);
          float bordes = smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.82, u);
          // arriba, lisa (sale del caño); abajo, deshecha en espuma
          float a = bordes * (0.1 + hilos * 0.42) * (0.6 + 0.4 * smoothstep(0.0, 0.25, v));
          a *= 1.0 - smoothstep(0.9, 1.0, v) * 0.5;
          vec3 c = mix(vec3(0.26, 0.32, 0.36), vec3(0.6, 0.68, 0.78), hilos) * min(1.2, vLuz);
          a *= 0.55 + 0.45 * min(1.0, vLuz);
          ${FOG_CHUNK}
          gl_FragColor = vec4(mix(c, fogColor, fog), a * (1.0 - fog));
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.BufferGeometry();
    const pos = [],
      uv = [],
      idx = [],
      luz = [];
    for (const c of this.cas) {
      const n0 = pos.length / 3;
      this.cortina(c, pos, uv, idx);
      for (let i = n0; i < pos.length / 3; i++) luz.push(c.luz ?? 1);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aLuz', new THREE.Float32BufferAttribute(luz, 1));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 6;
    // (bajo la calle: con el subsuelo)
    this.mesh.layers.set(1);
    g.scene.add(this.mesh);
    this.luciernagas();
    this.ojos();
    this.cielo();
  }

  // El cielo de la sima: lo que se ve por el agujero del huerto desde el
  // Vergel (la niebla de abajo se comía el cielo de verdad): un plano alto,
  // vuelto hacia abajo, con el azul de la noche, sus estrellas y la luna con
  // su halo; sólo con el subsuelo (desde la calle no está).
  cielo() {
    const [sx0, sz0, sx1, sz1] = VERGEL.sima;
    const cx = (sx0 + sx1) / 2,
      cz = (sz0 + sz1) / 2;
    const geo = new THREE.PlaneGeometry(46, 46);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uMoon: { value: new THREE.Vector2(0.06, -0.12) } },
      vertexShader: `
        varying vec2 vP;
        void main(){ vP = position.xz / 23.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform vec2 uMoon; varying vec2 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        void main(){
          float r = length(vP - uMoon);
          vec3 c = mix(vec3(0.16, 0.22, 0.34), vec3(0.05, 0.08, 0.14), smoothstep(0.0, 0.9, r));
          // el halo y la luna
          c += vec3(0.5, 0.58, 0.7) * exp(-r * 9.0) * 0.8;
          float disc = smoothstep(0.022, 0.018, r);
          vec2 q = (vP - uMoon) / 0.02;
          float mares = 0.12 * sin(q.x * 3.1 + 1.0) * sin(q.y * 2.3);
          c = mix(c, vec3(0.92, 0.95, 1.0) * (0.88 + mares), disc);
          // las estrellas (que tiemblan un poco)
          vec2 g = floor(vP * 160.0);
          float st = step(0.992, h(g)) * (0.6 + 0.4 * sin(uTime * (1.0 + h(g + 3.0) * 3.0) + h(g) * 40.0));
          c += vec3(0.8, 0.85, 1.0) * st * smoothstep(0.08, 0.3, r);
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.DoubleSide,
      fog: false,
      depthWrite: true,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cx, 22, cz);
    m.layers.set(1);
    m.frustumCulled = false;
    m.visible = false;
    this.g.scene.add(m);
    this.sky = m;
  }

  // La cortina de una cascada (dos hojas, una algo detrás de otra, que salen
  // hacia delante en parábola y se abren al caer) y su anillo de espuma.
  cortina(c, pos, uv, idx) {
    const N = c.y0 - c.y1 > 3 ? 24 : 14;
    const H = c.y0 - c.y1;
    const [dx, dz] = c.d;
    const px = -dz,
      pz = dx;
    for (const [off, k] of [
      [0, 1],
      [-0.06, 0.82],
    ]) {
      const base = pos.length / 3;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const y = c.y0 - H * t;
        const along = off + c.out * Math.sqrt(t) * k;
        const half = (c.w / 2) * (1 + t * c.open) * k;
        const cx = c.c[0] + dx * along,
          cz = c.c[1] + dz * along;
        pos.push(cx - px * half, y, cz - pz * half, cx + px * half, y, cz + pz * half);
        uv.push(0, t, 1, t);
      }
      for (let i = 0; i < N; i++) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    // la espuma del pie: un anillo plano sobre el agua
    const base = pos.length / 3;
    const fx = c.c[0] + dx * (c.out + 0.03),
      fz = c.c[1] + dz * (c.out + 0.03);
    const R0 = 0.15 * Math.min(1, c.foam),
      R1 = c.foam;
    const S = 16;
    for (let i = 0; i <= S; i++) {
      const a = (i / S) * Math.PI * 2;
      pos.push(fx + Math.cos(a) * R0, c.y1 + 0.02, fz + Math.sin(a) * R0 * 0.8, fx + Math.cos(a) * R1, c.y1 + 0.02, fz + Math.sin(a) * R1 * 0.8);
      uv.push(i / S, 0.98, i / S, 0.6);
    }
    for (let i = 0; i < S; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }

  // Las luciérnagas: puntos que dan luz, cada uno con su sitio, su fase y su
  // ritmo; el sombreador los mece y los enciende y apaga.
  luciernagas() {
    const pos = [],
      ph = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const [x, z, r, n] of VERGEL.luciernagas)
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2,
          d = Math.sqrt(rnd()) * r;
        const px = x + Math.cos(a) * d,
          pz = z + Math.sin(a) * d;
        pos.push(px, VERGEL.y + 0.5 + rnd() * 1.8, pz);
        ph.push(rnd() * 100, 0.4 + rnd() * 0.8, 0.5 + rnd() * 0.9);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 3));
    this.flyMat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, fogDensity: { value: 0 }, uScale: { value: 300 } },
      vertexShader: `
        attribute vec3 aPh; uniform float uTime; uniform float uScale; varying float vA; varying float vDist;
        void main(){
          float t = uTime * aPh.y + aPh.x;
          vec3 p = position + vec3(sin(t * 0.7) * 0.6 + sin(t * 1.9) * 0.15, sin(t * 0.9 + aPh.x) * 0.35, cos(t * 0.6) * 0.6 + cos(t * 1.7) * 0.15);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDist = -mv.z;
          // (se encienden y se apagan, cada una a su ritmo)
          float b = sin(uTime * aPh.z * 1.6 + aPh.x * 3.0);
          vA = smoothstep(0.1, 0.9, b) * 0.9 + 0.05;
          gl_PointSize = uScale * 0.045 / max(0.5, vDist);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float fogDensity; varying float vA; varying float vDist;
        void main(){
          vec2 q = gl_PointCoord - 0.5;
          float r = length(q);
          float a = smoothstep(0.5, 0.0, r);
          a = a * a;
          float fog = 1.0 - exp(-fogDensity * fogDensity * vDist * vDist * 0.5);
          gl_FragColor = vec4(vec3(0.86, 1.0, 0.52) * (1.2 + a), a * vA * (1.0 - fog));
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.flies = new THREE.Points(geo, this.flyMat);
    this.flies.frustumCulled = false;
    this.flies.layers.set(1);
    this.flies.renderOrder = 7;
    this.flies.visible = false;
    this.g.scene.add(this.flies);
  }

  // Los ojos de lo oscuro, al fondo del paso.
  ojos() {
    const grp = new THREE.Group();
    const mat = objMat('eyeGlow');
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), mat);
      m.position.set(s * 0.13, 0, 0);
      m.scale.set(1.3, 0.7, 1);
      grp.add(m);
    }
    // (al fondo de la galería de la Sé, detrás de la reja)
    grp.position.set(VERGEL.norte.x + 0.2, VERGEL.y + 2.35, 2.4);
    grp.layers.set(1);
    for (const m of grp.children) m.layers.set(1);
    grp.visible = false;
    this.g.scene.add(grp);
    this.eyes = grp;
    this.eyeT = 0;
    this.eyeCool = 6;
  }

  update(dt) {
    const g = this.g;
    const f = g.scene.fog;
    if (f) {
      this.mat.uniforms.fogColor.value.copy(f.color);
      this.mat.uniforms.fogDensity.value = f.density;
      this.flyMat.uniforms.fogDensity.value = f.density;
    }
    this.flyMat.uniforms.uScale.value = (g.renderer ? g.renderer.domElement.height : 600) * 0.9;
    // (sólo cuando se puede ver: el jugador bajo la plaza, cerca)
    const p = g.player.pos;
    const under = p.y < -2;
    let near = false;
    for (const c of this.cas) if (Math.hypot(p.x - c.c[0], p.z - c.c[1]) < 40 && p.y < c.y0 + 14 && p.y > c.y1 - 14) near = true;
    this.mesh.visible = under && near;
    const lamp = g.player.lamp;
    if (lamp) {
      lamp.getWorldPosition(this.mat.uniforms.uLamp.value);
      this.mat.uniforms.uLampK.value = lamp.visible && g.player.obj.visible ? Math.min(1.5, lamp.intensity / 8) : 0;
    }
    const B = VERGEL.sala;
    const enVergel = under && p.y > VERGEL.y - 3 && p.x > B[0] - 6 && p.x < B[2] + 2 && p.z > B[1] - 10 && p.z < B[3] + 2;
    this.flies.visible = enVergel;
    this.sky.visible = enVergel;
    this.updateOjos(dt, enVergel);
    if (!this.mesh.visible || !g.waters) return;
    // el agua de abajo, revuelta donde cae cada una
    for (const c of this.cas) {
      c.rip -= dt * c.k;
      if (c.rip > 0) continue;
      c.rip = 0.12 + Math.random() * 0.1;
      // (sólo las que están cerca: las de lejos no las ve nadie)
      if (Math.abs(p.y - c.y1) > 16 || Math.hypot(p.x - c.c[0], p.z - c.c[1]) > 30) continue;
      const fx = c.c[0] + c.d[0] * (c.out + 0.03) + (Math.random() - 0.5) * c.w * 0.9,
        fz = c.c[1] + c.d[1] * (c.out + 0.03) + (Math.random() - 0.5) * 0.4;
      g.waters.ripple(fx, fz, (0.7 + Math.random() * 0.6) * Math.min(1, 0.4 + c.w), c.y1);
    }
  }

  updateOjos(dt, enVergel) {
    const g = this.g,
      e = this.eyes;
    this.eyeCool -= dt;
    if (this.eyeT > 0) {
      this.eyeT -= dt;
      // (se encienden de golpe y se apagan despacio; parpadean una vez)
      const k = this.eyeT;
      e.visible = k > 0 && !(k > 0.62 && k < 0.7);
      for (const m of e.children) m.scale.setScalar(Math.min(1, k * 1.4)).multiply(new THREE.Vector3(1.3, 0.7, 1));
      if (this.eyeT <= 0) e.visible = false;
      return;
    }
    e.visible = false;
    if (!enVergel || this.eyeCool > 0 || g.state !== 'play') return;
    const R = VERGEL.raya,
      p = g.player.pos;
    const d = Math.hypot(p.x - (R.x0 + R.x1) / 2, p.z - R.z);
    if (d > 7.5 || p.z < R.z - 1.2) return;
    // (mirando hacia el paso)
    const cam = g.camera;
    const to = new THREE.Vector3().subVectors(e.position, cam.position).normalize();
    const fw = new THREE.Vector3();
    cam.getWorldDirection(fw);
    if (fw.dot(to) < 0.9) return;
    this.eyeT = 1.6;
    this.eyeCool = 40 + Math.random() * 40;
    e.visible = true;
    if (g.audio) g.audio.play('snarl', { x: e.position.x, y: e.position.y, z: e.position.z }, { gain: 0.5 });
  }
}
