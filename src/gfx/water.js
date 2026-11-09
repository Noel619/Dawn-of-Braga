// El agua: la de los canales y los tramos ahogados de las cloacas, la de las
// cisternas y los pozos, la del lago del Sumidero, la del río.
//
// Se ve el fondo a través de ella, cada vez menos cuanto más honda es y más
// de lado se mira (lo que el agua se traga por metro: clara); lo que se ve
// del agua misma es lo que coge de la luz del sitio (la horneada, la del
// farol y la de los fuegos cercanos) y lo que refleja: más cuanto más de
// lado se mira, y los brillos de las luces en las ondas. Donde da contra la
// piedra, una raya de espuma que no para quieta; donde corre, las estelas de
// la corriente. Se dibuja por los dos lados: desde abajo (buceando), la
// ventana de Snell, y fuera de ella, la superficie, que hace de espejo del
// agua oscura.
//
// Cada agua es una malla en rejilla con lo que hay debajo de cada vértice:
// aDepth, lo hondo (del suelo de la colisión, o de w.bedFn / w.depth), aShore,
// lo que falta hasta la orilla (de todas las aguas de esa altura juntas, o de
// w.shoreFn) y aLit, la luz horneada del sitio (bakeLight, cuando la sonda
// ya existe). Las gotas que caen de la bóveda abren sus anillos (ripple).
import * as THREE from 'three';
import { G, SKY_GLSL } from './materials.js';

const MAX_DRIPS = 6;
// las luces del pool (fuegos, braseros) que se reflejan en el agua
const NL = 4;

// (lo que comparten todas las aguas: el farol y las luces cercanas)
const SH = {
  uLamp: { value: new THREE.Vector3(0, -99, 0) },
  uLampK: { value: 0 },
  uLP: { value: Array.from({ length: NL }, () => new THREE.Vector4(0, -999, 0, 1)) },
  uLC: { value: Array.from({ length: NL }, () => new THREE.Vector3()) },
};

function waterMat(o) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  u.uTime = G.uTime;
  u.uSkyGlow = G.uSkyGlow;
  u.uSun = G.uSun;
  u.uSunDir = G.uSunDir;
  u.uHFog = G.uHFog;
  u.uDeep = { value: new THREE.Color(o.deep ?? 0x05080a) };
  u.uSky = { value: new THREE.Color(o.sky ?? 0x2a3038) };
  u.uGlint = { value: new THREE.Color(o.glint ?? 0xb8c8dc) };
  // el color que coge el agua turbia de la luz que le llega (si no se dice,
  // el de su reflejo, algo más vivo: el vino del lagar, rojo; el agua de un
  // aljibe, gris)
  u.uTint = { value: o.tint !== undefined ? new THREE.Color(o.tint) : new THREE.Color(o.sky ?? 0x2a3038).multiplyScalar(1.4) };
  u.uLight = { value: new THREE.Vector3(...(o.light || [0, 10, 0])) };
  u.uLightK = { value: o.lightK ?? 1 };
  u.uDrips = { value: Array.from({ length: MAX_DRIPS }, () => new THREE.Vector4(0, 0, -99, 0)) };
  u.uLamp = SH.uLamp;
  u.uLampK = SH.uLampK;
  u.uLP = SH.uLP;
  u.uLC = SH.uLC;
  u.uSpot = { value: new THREE.Vector4(...(o.spot || [0, 0, 0, 0])) };
  // oleaje (alto de las ondas) y corriente (hacia dónde corre el agua)
  u.uAmp = { value: o.amp ?? 0.035 };
  u.uFlow = { value: new THREE.Vector2(...(o.flow || [0, 0])) };
  // lo que se traga el agua por metro (turbia: mucho; clara: poco), la
  // espuma de las orillas y la luz de ambiente que tiene siempre
  u.uClear = { value: o.clear ?? 1.6 };
  u.uFoam = { value: o.foam ?? 1 };
  u.uAmb = { value: new THREE.Color(o.amb ?? 0x0b0e0e) };
  // lo que refleja de lo de alrededor (fuera, con el cielo, más)
  u.uRefl = { value: o.refl ?? 0.22 };
  return new THREE.ShaderMaterial({
    uniforms: u,
    fog: true,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aDepth; attribute float aShore; attribute vec3 aLit;
      varying vec3 vW; varying float vDepth; varying float vShore; varying vec3 vLit; varying vec3 vSkyDir;
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vDepth = aDepth;
        vShore = aShore;
        vLit = aLit;
        vec4 mvPosition = viewMatrix * wp;
        vSkyDir = transpose(mat3(viewMatrix)) * mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uGlint; uniform vec3 uTint;
      uniform vec3 uLight; uniform float uLightK; uniform vec4 uDrips[${MAX_DRIPS}];
      uniform vec3 uLamp; uniform float uLampK; uniform vec4 uSpot; uniform float uAmp; uniform vec2 uFlow;
      uniform float uClear; uniform float uFoam; uniform vec3 uAmb; uniform float uRefl;
      uniform vec4 uLP[${NL}]; uniform vec3 uLC[${NL}];
      uniform float uSkyGlow; uniform float uSun; uniform vec3 uSunDir; uniform vec4 uHFog;
      varying vec3 vW; varying float vDepth; varying float vShore; varying vec3 vLit; varying vec3 vSkyDir;
      #include <fog_pars_fragment>
      ${SKY_GLSL}
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hs(i),hs(i+vec2(1,0)),f.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x), f.y); }
      float H(vec2 p){
        vec2 fl = uFlow * uTime;
        float h = ns((p - fl)*1.3 + vec2(uTime*0.07, -uTime*0.05))*0.5 + ns((p - fl*1.4)*2.9 - vec2(uTime*0.11, uTime*0.09))*0.25
          + ns((p - fl*1.8)*6.3 + vec2(uTime*0.23, uTime*0.17))*0.1;
        h *= uAmp;
        for (int i = 0; i < ${MAX_DRIPS}; i++){
          vec4 d = uDrips[i];
          float age = uTime - d.z;
          if (age < 0.0 || age > 3.5) continue;
          float r = length(p - d.xy);
          float front = age * 0.55;
          float env = exp(-abs(r - front) * 7.0) * exp(-age * 1.1) * d.w;
          h += sin((r - front) * 38.0) * env * 0.012;
        }
        return h;
      }
      void main(){
        vec2 p = vW.xz;
        float e = 0.02;
        float h0 = H(p);
        vec3 N = normalize(vec3(-(H(p + vec2(e,0.)) - h0) / e, 1.0, -(H(p + vec2(0.,e)) - h0) / e));
        vec3 Vd = cameraPosition - vW;
        float vd = length(Vd);
        vec3 V = Vd / max(vd, 1e-4);
        // (vista desde abajo: buceando)
        bool below = Vd.y < 0.0;
        if (below) N = vec3(-N.x, -N.y, -N.z);
        float ndv = max(dot(N, V), 0.0);
        float F = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);
        vec3 R = reflect(-V, N);
        // la luz que llega aquí: la horneada del sitio, el farol y los fuegos
        vec3 lit = uAmb + vLit;
        float ld = length(uLamp - vW);
        lit += vec3(1.0, 0.66, 0.36) * uLampK * 1.3 / (1.0 + ld * ld * 0.22);
        vec3 spec = vec3(0.0);
        for (int i = 0; i < ${NL}; i++) {
          vec3 L = uLP[i].xyz - vW;
          float d = length(L);
          L /= max(d, 1e-3);
          float att = clamp(1.0 - d / uLP[i].w, 0.0, 1.0);
          att *= att;
          lit += uLC[i] * att * 0.3;
          float rl = max(dot(R, L), 0.0);
          spec += uLC[i] * att * (pow(rl, 60.0) * 0.9 + pow(rl, 7.0) * 0.05);
        }
        // la llama del farol, en las ondas
        vec3 Lp = (uLamp - vW) / max(ld, 1e-3);
        float rp = max(dot(R, Lp), 0.0);
        spec += vec3(1.0, 0.62, 0.28) * (pow(rp, 140.0) * 2.4 + pow(rp, 12.0) * 0.14) * uLampK * exp(-ld * 0.08);
        // la luz del sitio (el pozo, la reja, la sima)
        vec3 L0 = normalize(uLight - vW);
        float r0 = max(dot(R, L0), 0.0);
        spec += uGlint * uLightK * (pow(r0, 90.0) * 1.6 + pow(r0, 8.0) * 0.1);
        // lo que se ve del fondo: cuanto más hondo y más de lado, menos
        float path = max(vDepth, 0.0) / max(abs(V.y), 0.1);
        float trans = exp(-path * uClear);
        // el agua misma: lo que coge de la luz (la turbia brilla un poco junto
        // al farol) y lo que refleja de lo de alrededor
        float lum = dot(lit, vec3(0.3, 0.59, 0.11));
        vec3 body = uDeep + uTint * lit * 0.5;
        vec3 refl = uSky * (uRefl + lum * 0.7);
        // la espuma de las orillas y las estelas de la corriente
        float sp = length(uFlow);
        vec2 fd = sp > 0.001 ? uFlow / sp : vec2(1.0, 0.0);
        vec2 q = vec2(dot(p, fd), dot(p, vec2(-fd.y, fd.x)));
        float st = ns(vec2(q.x * 0.9 - uTime * sp * 2.2, q.y * 15.0)) * ns(vec2(q.x * 0.45 - uTime * sp * 1.5, q.y * 5.0 + 4.0));
        // (las estelas: rayas finas a lo largo de la corriente, más junto a
        // las orillas, donde el agua se arruga)
        // (finas y rotas: un hilo de espuma, no una raya de luz)
        float streak = smoothstep(0.56, 0.72, st) * smoothstep(0.12, 0.4, sp) * (0.35 + 0.65 * (1.0 - smoothstep(0.1, 0.5, vShore))) * smoothstep(0.35, 0.6, ns(p * 4.0 - uFlow * uTime * 1.5));
        float sn = ns(p * 7.0 + vec2(uTime * 0.31, -uTime * 0.23) - uFlow * uTime * 2.5) * 0.65 + ns(p * 17.0 - vec2(uTime * 0.5, uTime * 0.4)) * 0.35;
        float foam = (1.0 - smoothstep(0.0, 0.04 + 0.13 * sn, vShore)) * (0.45 + 0.55 * sn);
        foam = max(foam, streak * 0.16) * uFoam;
        // donde cae luz de arriba (un pozo): una mancha que las ondas rompen
        vec3 spot = vec3(0.0);
        if (uSpot.w > 0.0) {
          vec2 qq = p + N.xz * 0.6;
          float dd = length(qq - uSpot.xy) / uSpot.z;
          float cau = 0.65 + 0.35 * ns(qq * 7.0 + uTime * 0.6) * ns(qq * 5.0 - uTime * 0.4);
          spot = uGlint * uSpot.w * smoothstep(1.0, 0.1, dd) * cau * 0.35;
        }
        vec3 col;
        float a;
        if (!below) {
          float op = 1.0 - trans;
          // (premultiplicado: lo que pone el agua; el fondo entra por 1 - a)
          col = body * op * (1.0 - F) + refl * F + spec + spot + vec3(0.55, 0.6, 0.56) * min(lit, vec3(0.7)) * foam * 0.55;
          a = clamp(op * (1.0 - F) + F * 0.9 + foam * 0.45, 0.0, 1.0);
        } else {
          // desde abajo: por la ventana (lo que cae en ~48° de la vertical) se
          // ve hacia arriba; fuera, el espejo del agua oscura
          float win = smoothstep(0.64, 0.74, ndv);
          float cau = ns(p * 3.0 + uTime * 0.4) * ns(p * 5.0 - uTime * 0.3);
          col = mix(uDeep * 1.2 + uTint * lit * 0.35, uSky * 0.25 + lit * 0.3 + spot, win) + spec * 0.25 + uTint * cau * lum * 0.2;
          a = mix(0.95, 0.4, win);
        }
        #ifdef USE_FOG
          float fh = mix(1.0, uHFog.z, smoothstep(uHFog.x, uHFog.y, cameraPosition.y + vSkyDir.y));
          fh = mix(fh, 1.0, smoothstep(uHFog.w * 0.7, uHFog.w * 0.97, vFogDepth));
          float fdn = fogDensity * fh;
          float fogFactor = 1.0 - exp(-fdn * fdn * vFogDepth * vFogDepth);
          col = mix(col, skyColor(fogColor, normalize(vSkyDir)) * a, fogFactor);
        #endif
        gl_FragColor = vec4(col, a);
      }`,
  });
}

// ------------------------------------------------------------------ la malla
// (las aguas de una misma altura, juntas: para saber dónde está la orilla)
class Union {
  constructor(list) {
    this.cell = 4;
    this.map = new Map();
    for (const w of list) {
      const [x0, z0, x1, z1] = w.r;
      for (let i = Math.floor(x0 / this.cell); i <= Math.floor(x1 / this.cell); i++)
        for (let j = Math.floor(z0 / this.cell); j <= Math.floor(z1 / this.cell); j++) {
          const k = i * 73856093 ^ j * 19349663;
          let a = this.map.get(k);
          if (!a) this.map.set(k, (a = []));
          a.push(w.r);
        }
    }
  }
  inside(x, z) {
    const a = this.map.get(Math.floor(x / this.cell) * 73856093 ^ Math.floor(z / this.cell) * 19349663);
    if (!a) return false;
    const e = 0.03;
    for (const r of a) if (x > r[0] - e && x < r[2] + e && z > r[1] - e && z < r[3] + e) return true;
    return false;
  }
  // lo que hay hasta salir del agua, por los cuatro rumbos (hasta 'max')
  shore(x, z, max = 1.6) {
    let best = max;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      for (let s = 0.04; s < best; s += 0.04)
        if (!this.inside(x + dx * s, z + dz * s)) {
          best = s;
          break;
        }
    }
    return best;
  }
}

function buildGeo(w, col, union) {
  const pos = [],
    dep = [],
    sho = [],
    idx = [];
  const bedAt = (x, z) => {
    if (w.bedFn) return w.bedFn(x, z);
    if (w.depth !== undefined) return w.y - w.depth;
    const g = col ? col.groundHeight(x, z, 0.02, w.y - 0.004) : -1e3;
    return g < w.y - 40 ? w.y - (w.depthDef ?? 1.5) : g;
  };
  const shoreAt = (x, z) => (w.shoreFn ? w.shoreFn(x, z) : w.shape === 'circle' ? w.r - Math.hypot(x - w.x, z - w.z) : union ? union.shore(x, z) : 1.6);
  const vert = (x, z) => {
    pos.push(x, w.y, z);
    dep.push(Math.max(0.01, w.y - bedAt(x, z)));
    sho.push(Math.max(0, shoreAt(x, z)));
  };
  if (w.shape === 'circle') {
    const R = 6,
      S = 24;
    vert(w.x, w.z);
    for (let i = 1; i <= R; i++)
      for (let j = 0; j < S; j++) {
        const a = (j / S) * Math.PI * 2,
          r = (w.r * i) / R;
        vert(w.x + Math.cos(a) * r, w.z + Math.sin(a) * r);
      }
    const at = (i, j) => (i === 0 ? 0 : 1 + (i - 1) * S + (j % S));
    for (let j = 0; j < S; j++) idx.push(0, at(1, j + 1), at(1, j));
    for (let i = 1; i < R; i++)
      for (let j = 0; j < S; j++) {
        const a = at(i, j),
          b = at(i, j + 1),
          c = at(i + 1, j + 1),
          d = at(i + 1, j);
        idx.push(a, b, c, a, c, d);
      }
  } else {
    const [x0, z0, x1, z1] = w.r;
    const W = x1 - x0,
      D = z1 - z0;
    // (la rejilla: fina en lo estrecho —la orilla se ve bien—, más gruesa en
    // lo grande)
    const cs = w.cell ?? Math.max(0.25, Math.min(1.5, Math.max(W, D) / 40));
    const nx = Math.max(1, Math.min(220, Math.ceil(W / Math.min(cs, W / 3 || cs)))),
      nz = Math.max(1, Math.min(220, Math.ceil(D / Math.min(cs, D / 3 || cs))));
    const keep = w.poly ? (x, z) => w.poly(x, z) : null;
    const id = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
    let n = 0;
    const used = new Uint8Array((nx + 1) * (nz + 1));
    // (con polígono: sólo las celdas que tienen algo dentro)
    const cellOk = [];
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        let ok = true;
        if (keep) {
          ok = false;
          for (const [a, b] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
            [0.5, 0.5],
          ])
            if (keep(x0 + (W * (i + a)) / nx, z0 + (D * (j + b)) / nz)) ok = true;
        }
        cellOk.push(ok);
        if (ok) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) used[(j + b) * (nx + 1) + i + a] = 1;
      }
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const k = j * (nx + 1) + i;
        if (!used[k]) continue;
        id[k] = n++;
        vert(x0 + (W * i) / nx, z0 + (D * j) / nz);
      }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        if (!cellOk[j * nx + i]) continue;
        const a = id[j * (nx + 1) + i],
          b = id[j * (nx + 1) + i + 1],
          c = id[(j + 1) * (nx + 1) + i + 1],
          d = id[(j + 1) * (nx + 1) + i];
        idx.push(a, d, c, a, c, b);
      }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
  geo.setAttribute('aShore', new THREE.Float32BufferAttribute(sho, 1));
  geo.setAttribute('aLit', new THREE.Float32BufferAttribute(new Float32Array(dep.length * 3), 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

// ctx.waters: [{ shape: 'rect', r: [x0, z0, x1, z1] } | { shape: 'circle', x, z, r }, con y,
//   light, lightK, deep, sky, glint, tint, amb, clear, foam, flow, amp, spot,
//   drips; y, para lo hondo: depth (fija), bedFn(x, z) (la altura del fondo) o
//   la colisión; shoreFn(x, z), poly(x, z) (lo que es agua, en planta)]
export class Waters {
  constructor(game, list) {
    this.g = game;
    this.list = [];
    const col = game.world && game.world.col;
    // (las de cada altura, juntas)
    const byY = new Map();
    for (const w of list) {
      if (w.shape === 'circle' || w.shoreFn) continue;
      const k = Math.round(w.y * 50);
      if (!byY.has(k)) byY.set(k, []);
      byY.get(k).push(w);
    }
    const unions = new Map();
    for (const [k, ws] of byY) unions.set(k, new Union(ws));
    for (const w of list) {
      const geo = buildGeo(w, col, unions.get(Math.round(w.y * 50)));
      const m = new THREE.Mesh(geo, waterMat(w));
      // (el agua de bajo tierra va con el subsuelo: sólo se dibuja cuando se
      // está abajo o se ve por un hueco; son muchas, en las cloacas)
      if (w.y < -1.5) m.layers.set(1);
      m.renderOrder = 1;
      game.scene.add(m);
      this.list.push({ ...w, m, next: 1 + Math.random() * 3, slot: 0 });
    }
    this._lp = new THREE.Vector3();
    // (las gotas que van cayendo de la bóveda)
    this.cae = [];
  }

  // La luz horneada del sitio en cada vértice (con la sonda del juego, que
  // se crea después que el agua).
  bakeLight(probe, roomAt) {
    for (const w of this.list) {
      const g = w.m.geometry;
      const P = g.attributes.position,
        A = g.attributes.aLit;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i),
          y = P.getY(i),
          z = P.getZ(i);
        const o = probe.sample(x, y + 0.3, z, roomAt(x, y + 0.3, z));
        A.setXYZ(i, Math.min(2, o[0] * 0.9), Math.min(2, o[1] * 0.9), Math.min(2, o[2] * 0.9));
      }
      A.needsUpdate = true;
    }
  }

  // Una gota (o algo que cae) en (x, z): el anillo se abre desde ahí.
  ripple(x, z, amp = 1, y = null) {
    for (const w of this.list) {
      if (!this.inside(w, x, z)) continue;
      if (y !== null && Math.abs(y - w.y) > 2.5) continue;
      const D = w.m.material.uniforms.uDrips.value;
      D[w.slot].set(x, z, G.uTime.value, amp);
      w.slot = (w.slot + 1) % D.length;
    }
  }
  inside(w, x, z) {
    if (w.shape === 'circle') return Math.hypot(x - w.x, z - w.z) < w.r;
    if (!(x > w.r[0] && x < w.r[2] && z > w.r[1] && z < w.r[3])) return false;
    return !w.poly || w.poly(x, z);
  }
  // El agua que hay en (x, z) a la altura y (con margen): la más alta que
  // quede por encima de y - below.
  at(x, y, z, below = 0.6) {
    let best = null;
    for (const w of this.list) {
      if (w.y < y - below || !this.inside(w, x, z)) continue;
      if (!best || w.y < best.y) best = w;
    }
    return best;
  }

  update(dt) {
    const g = this.g;
    const p = g.player.pos;
    const lamp = g.player.lamp;
    if (lamp) {
      lamp.getWorldPosition(this._lp);
      SH.uLamp.value.copy(this._lp);
      SH.uLampK.value = lamp.visible && g.player.obj.visible ? Math.min(1.5, lamp.intensity / 8) : 0;
    }
    // las luces del pool que más alumbran cerca del jugador
    const pool = g.fx && g.fx.lights ? g.fx.lights.slots : null;
    if (pool) {
      const c = [];
      for (const s of pool) {
        const L = s.light;
        if (L.intensity <= 0.05) continue;
        const d = L.position.distanceTo(p);
        c.push([L.intensity / (1 + d * d * 0.05), L]);
      }
      c.sort((a, b) => b[0] - a[0]);
      for (let i = 0; i < NL; i++) {
        const L = c[i] && c[i][1];
        if (!L) {
          SH.uLP.value[i].set(0, -999, 0, 1);
          SH.uLC.value[i].set(0, 0, 0);
          continue;
        }
        SH.uLP.value[i].set(L.position.x, L.position.y, L.position.z, Math.max(1, L.distance || 10));
        SH.uLC.value[i].set(L.color.r, L.color.g, L.color.b).multiplyScalar(Math.min(4, L.intensity / 8));
      }
    }
    for (const w of this.list) {
      // (gotea salvo que se diga lo contrario)
      if (w.drips === false) continue;
      w.next -= dt;
      if (w.next > 0) continue;
      // (las de las cloacas, más espaciadas: son muchas; las goteras, lo que
      // se diga)
      w.next = w.dripEvery ? w.dripEvery * (0.6 + Math.random() * 0.8) : w.dripH ? 4 + Math.random() * 9 : 1.4 + Math.random() * 3.5;
      // (las de lejos no gotean: nadie las ve ni las oye)
      if (Math.abs(p.y - w.y) > 12) continue;
      let x, z;
      if (w.shape === 'circle') {
        const a = Math.random() * Math.PI * 2,
          r = Math.sqrt(Math.random()) * w.r * 0.85;
        x = w.x + Math.cos(a) * r;
        z = w.z + Math.sin(a) * r;
      } else {
        x = w.r[0] + Math.random() * (w.r[2] - w.r[0]);
        z = w.r[1] + Math.random() * (w.r[3] - w.r[1]);
      }
      // (en el agua de verdad: el lago no es su rectángulo)
      if (!this.inside(w, x, z)) continue;
      // la gota que cae de la bóveda (si se ve: cerca), y al llegar, el
      // anillo y su ruido; si no, el anillo sin más
      const h = w.dripH ?? 0;
      const near = Math.hypot(p.x - x, p.z - z) < 14 && Math.abs(p.y - w.y) < 5;
      if (near && h > 0.5 && g.fx && g.fx.blood) {
        g.fx.blood.emit(x, w.y + h, z, 1, { color: [0.5, 0.58, 0.6], speed: 0, up: 0, gravity: 14, life: 2, stain: false });
        this.cae.push({ x, z, y: w.y, t: Math.sqrt((2 * h) / 14) });
      } else this.gota(x, z, w.y, near);
    }
    // las gotas que llegan
    for (let i = this.cae.length - 1; i >= 0; i--) {
      const c = this.cae[i];
      c.t -= dt;
      if (c.t > 0) continue;
      this.cae.splice(i, 1);
      this.gota(c.x, c.z, c.y, true);
    }
  }
  // Una gota que cae en el agua: el anillo, unas salpicaduras y su ruido.
  gota(x, z, y, near) {
    const g = this.g,
      p = g.player.pos;
    this.ripple(x, z, 0.6 + Math.random() * 0.6, y);
    if (!near) return;
    if (g.fx && g.fx.blood) g.fx.blood.emit(x, y + 0.02, z, 3, { color: [0.55, 0.62, 0.64], speed: 0.5, up: 0.7, gravity: 9, life: 0.35, stain: false });
    if (g.audio && Math.hypot(p.x - x, p.z - z) < 16 && Math.abs(p.y - y) < 4) g.audio.play('drip', { x, y, z });
  }
}
