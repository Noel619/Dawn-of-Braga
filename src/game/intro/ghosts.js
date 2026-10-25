// Los ecos de la introducción: lo que pasó, visto en los sitios de ahora.
// Figuras de luz pálida (más viva en los bordes, como la llama vista de
// lado) que aparecen y se deshacen en ceniza que sube. Cada una es un rig
// de primitivas con un único material propio (su color y su fundido), sus
// poses (en grados, relativas al reposo: de pie, los brazos colgando) y,
// por encima, una respiración y, si anda, el paso.
//
//   kind     roman, cantero, martin, monk, veiled, arch, canon, soldier,
//            almohad, standard, man, woman
//   pose     'stand', 'kneel', 'pray', 'bow', 'reach', 'raise', 'lookUp',
//            'sing', 'pull', 'carveUp', 'carveHit', 'kcarveUp', 'kcarveHit',
//            'cover', 'kraise', 'turnL',
//            'turnR', 'staff', 'lantern', 'spear', 'shield', 'limp'
import * as THREE from 'three';
import { Rig, slerpE } from '../../entities/rig.js';
import { humanoidJoints } from '../../entities/models.js';
import { G, additiveFog } from '../../gfx/materials.js';
import { getTexture } from '../../gfx/textures.js';
import { DEG } from '../../core/util.js';

const V3 = THREE.Vector3;

// ------------------------------------------------------------ el material
export function ghostMat(color = [0.7, 0.63, 0.52], seed = 0) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  u.uTime = G.uTime;
  u.uColor = { value: new THREE.Color(color[0], color[1], color[2]) };
  u.uFade = { value: 0 };
  u.uSeed = { value: seed };
  u.uGain = { value: 1 };
  u.uBase = { value: 0 }; // la altura de los pies: de ahí para abajo, se apaga
  return new THREE.ShaderMaterial({
    uniforms: u,
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uFade; uniform float uSeed; uniform float uGain; uniform float uBase;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <fog_pars_fragment>
      float hs(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float ns(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hs(i), hs(i + vec3(1,0,0)), f.x), mix(hs(i + vec3(0,1,0)), hs(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hs(i + vec3(0,0,1)), hs(i + vec3(1,0,1)), f.x), mix(hs(i + vec3(0,1,1)), hs(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){
        float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        // la ceniza que sube: el ruido corre hacia arriba; donde pasa del
        // umbral del fundido, la figura ya no está, y en el borde arde
        float n = ns(vW * 3.1 + vec3(uSeed * 7.0, -uTime * 0.55, uSeed * 3.0)) * 0.7 + ns(vW * 9.0 + vec3(0.0, -uTime * 1.3, uSeed)) * 0.3;
        float th = uFade * 1.12 - 0.06;
        if (n > th) discard;
        float edge = smoothstep(th - 0.1, th, n) * step(uFade, 0.995);
        // casi transparente por dentro; la luz, en el contorno
        float body = 0.16 + 0.84 * pow(rim, 2.0);
        // un parpadeo lento, como de vela, y unas vetas que suben
        float fl = 0.88 + 0.12 * sin(uTime * 7.3 + uSeed * 11.0) * sin(uTime * 2.1 + uSeed);
        float vet = 0.78 + 0.22 * sin(vW.y * 26.0 - uTime * 2.4 + uSeed * 5.0);
        vec3 col = uColor * body * fl * vet + vec3(1.0, 0.62, 0.3) * edge * 0.9;
        // las piernas se pierden hacia el suelo, como en la niebla
        col *= 0.22 + 0.78 * smoothstep(uBase - 0.05, uBase + 0.95, vW.y);
        col *= uGain;
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          col *= 1.0 - fogFactor;
        #endif
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// ------------------------------------------------------------ las figuras
const box = (j, s, p, o = {}) => ({ j, type: 'box', s, p, mat: 'g', ...o });
// cuerpo común: torso, cuello, cabeza, brazos con manos, piernas y pies
function body(o = {}) {
  const w = o.w ?? 1;
  return [
    box('hips', [0.36 * w, 0.2, 0.24], [0, -0.02, 0]),
    box('chest', [0.42 * w, 0.52, 0.26], [0, 0.26, 0], { taper: [0.84, 0.9] }),
    { j: 'chest', type: 'cyl', s: [0.07, 0.09, 0.12], p: [0, 0.54, 0], mat: 'g' },
    { j: 'head', type: 'sphere', s: [0.115, 0.14, 0.125], p: [0, 0.12, 0.01], seg: 8, seg2: 6, mat: 'g' },
    box('armL', [0.12, 0.31, 0.12], [0, -0.14, 0], { taper: [0.85, 0.85] }),
    box('foreL', [0.1, 0.27, 0.1], [0, -0.13, 0], { taper: [0.8, 0.8] }),
    box('handL', [0.08, 0.1, 0.09], [0, -0.05, 0.01]),
    box('armR', [0.12, 0.31, 0.12], [0, -0.14, 0], { taper: [0.85, 0.85] }),
    box('foreR', [0.1, 0.27, 0.1], [0, -0.13, 0], { taper: [0.8, 0.8] }),
    box('handR', [0.08, 0.1, 0.09], [0, -0.05, 0.01]),
    box('legL', [0.15, 0.46, 0.16], [0, -0.22, 0], { taper: [0.8, 0.85] }),
    box('shinL', [0.12, 0.42, 0.13], [0, -0.2, 0], { taper: [0.9, 0.9] }),
    box('legR', [0.15, 0.46, 0.16], [0, -0.22, 0], { taper: [0.8, 0.85] }),
    box('shinR', [0.12, 0.42, 0.13], [0, -0.2, 0], { taper: [0.9, 0.9] }),
    box('footL', [0.11, 0.07, 0.24], [0, -0.03, 0.05]),
    box('footR', [0.11, 0.07, 0.24], [0, -0.03, 0.05]),
  ];
}
// el hábito, la túnica larga, la alba: de la cadera a los tobillos
const robe = (len = 1.0, wb = 1.42) => box('hips', [0.46, len, 0.34], [0, -len / 2, 0], { taper: [wb, 1.3] });
// la capucha caída sobre la espalda, o puesta
const hood = (up = true) => (up ? { j: 'head', type: 'sphere', s: [0.16, 0.17, 0.17], p: [0, 0.13, -0.03], seg: 8, seg2: 6, mat: 'g' } : box('chest', [0.3, 0.14, 0.16], [0, 0.52, -0.12]));
// un asta en la mano (vertical con el antebrazo en horizontal hacia delante)
const shaft = (hand, len, lo = 0.42, r = 0.022) => ({ j: hand, type: 'cyl', s: [r, r, len], p: [0, -0.04, len / 2 - lo - 0.42 + 0.42], r: [90, 0, 0], mat: 'g' });

const DEFS = {
  // el sacerdote romano, con la toga sobre la cabeza
  roman: () => [...body(), robe(1.0, 1.5), box('head', [0.28, 0.2, 0.27], [0, 0.17, -0.04]), box('chest', [0.5, 0.3, 0.3], [0.04, 0.38, 0], { r: [0, 0, -12] })],
  // el cantero: la túnica corta, el mazo y el cincel
  cantero: () => [...body(), box('hips', [0.44, 0.42, 0.3], [0, -0.2, 0], { taper: [1.25, 1.15] }), shaft('handR', 0.32, 0.12, 0.02), box('handR', [0.12, 0.09, 0.09], [0, -0.04, 0.3]), shaft('handL', 0.2, 0.06, 0.012)],
  // Martín: el hábito, la capucha, el báculo (izquierda) y el farol (derecha)
  martin: () => [
    ...body(),
    robe(1.0, 1.4),
    hood(true),
    { j: 'handL', type: 'cyl', s: [0.022, 0.022, 1.78], p: [0, -0.04, -0.42], r: [90, 0, 0], mat: 'g' },
    { j: 'handL', type: 'torus', s: [0.09, 0.018], seg: 10, seg2: 4, p: [0, -0.04, 0.55], r: [0, 90, 0], mat: 'g' },
    box('handR', [0.12, 0.16, 0.12], [0, -0.22, 0.02]),
  ],
  monk: () => [...body(), robe(1.0, 1.4), hood(true)],
  // los que se taparon la cara: el velo les cae por delante hasta el pecho
  veiled: () => [...body(), robe(1.0, 1.4), hood(true), box('head', [0.3, 0.46, 0.05], [0, 0.0, 0.15], { taper: [1.25, 1] })],
  // el arzobispo: la alba, la casulla, el palio en Y, la mitra y el incensario
  arch: () => [
    ...body(),
    robe(1.0, 1.35),
    { j: 'chest', type: 'cyl', s: [0.25, 0.4, 1.02], p: [0, 0.02, 0], seg: 10, sc: [1, 1, 0.66], mat: 'g' },
    box('chest', [0.06, 0.5, 0.02], [0, 0.18, 0.19]),
    box('chest', [0.05, 0.26, 0.02], [0.09, 0.42, 0.19], { r: [0, 0, 40] }),
    box('chest', [0.05, 0.26, 0.02], [-0.09, 0.42, 0.19], { r: [0, 0, -40] }),
    { j: 'head', type: 'cone', s: [0.15, 0.36], seg: 4, p: [0, 0.38, 0], r: [0, 45, 0], sc: [1, 1, 0.62], mat: 'g' },
    { j: 'censer', type: 'cyl', s: [0.008, 0.008, 0.62], p: [0, -0.31, 0], mat: 'g' },
    { j: 'censer', type: 'sphere', s: [0.11, 0.12, 0.11], p: [0, -0.68, 0], seg: 8, seg2: 6, mat: 'g' },
    { j: 'censer', type: 'cone', s: [0.07, 0.12], seg: 6, p: [0, -0.56, 0], mat: 'g' },
  ],
  // el canónigo: la sotana y la sobrepelliz
  canon: () => [...body(), robe(1.0, 1.35), box('chest', [0.56, 0.78, 0.34], [0, 0.08, 0], { taper: [1.35, 1.15] }), hood(false)],
  // un soldado de la guarnición: la malla, el yelmo de nasal, el escudo de
  // lágrima y la lanza
  soldier: () => [
    ...body(),
    box('hips', [0.42, 0.36, 0.28], [0, -0.16, 0], { taper: [1.15, 1.1] }),
    { j: 'head', type: 'cone', s: [0.15, 0.24], seg: 8, p: [0, 0.26, 0], mat: 'g' },
    box('foreL', [0.06, 0.62, 0.48], [0.07, -0.16, 0.08], { taper: [0.4, 1] }),
    { j: 'handR', type: 'cyl', s: [0.02, 0.02, 2.4], p: [0, -0.04, 0.18], r: [90, 0, 0], mat: 'g' },
    { j: 'handR', type: 'cone', s: [0.04, 0.22], seg: 4, p: [0, -0.04, 1.46], r: [90, 0, 0], mat: 'g' },
  ],
  // un soldado almohade: la túnica larga, el turbante sobre el casco, la
  // adarga (el escudo de cuero de dos lóbulos) y la lanza
  almohad: () => [
    ...body(),
    box('hips', [0.48, 0.72, 0.34], [0, -0.34, 0], { taper: [1.3, 1.2] }),
    { j: 'head', type: 'sphere', s: [0.15, 0.13, 0.15], p: [0, 0.2, 0], seg: 8, seg2: 5, mat: 'g' },
    { j: 'head', type: 'torus', s: [0.13, 0.05], seg: 10, seg2: 4, p: [0, 0.17, 0], r: [90, 0, 0], mat: 'g' },
    { j: 'foreL', type: 'sphere', s: [0.05, 0.26, 0.2], p: [0.07, -0.08, 0.1], seg: 8, seg2: 6, mat: 'g' },
    { j: 'foreL', type: 'sphere', s: [0.05, 0.22, 0.18], p: [0.07, -0.32, 0.1], seg: 8, seg2: 6, mat: 'g' },
    { j: 'handR', type: 'cyl', s: [0.02, 0.02, 2.5], p: [0, -0.04, 0.2], r: [90, 0, 0], mat: 'g' },
    { j: 'handR', type: 'cone', s: [0.04, 0.24], seg: 4, p: [0, -0.04, 1.55], r: [90, 0, 0], mat: 'g' },
  ],
  // el abanderado almohade: la bandera, en un asta alta a su lado
  standard: () => [
    ...body(),
    box('hips', [0.48, 0.72, 0.34], [0, -0.34, 0], { taper: [1.3, 1.2] }),
    { j: 'head', type: 'sphere', s: [0.15, 0.13, 0.15], p: [0, 0.2, 0], seg: 8, seg2: 5, mat: 'g' },
    { j: 'head', type: 'torus', s: [0.13, 0.05], seg: 10, seg2: 4, p: [0, 0.17, 0], r: [90, 0, 0], mat: 'g' },
    { j: 'hips', type: 'cyl', s: [0.025, 0.025, 4.2], p: [0.32, 1.1, 0.12], mat: 'g' },
    box('hips', [0.95, 1.25, 0.03], [0.8, 2.55, 0.12]),
  ],
  man: () => [...body(), box('hips', [0.44, 0.5, 0.3], [0, -0.22, 0], { taper: [1.22, 1.12] }), hood(false)],
  woman: () => [...body({ w: 0.92 }), robe(0.98, 1.55), box('head', [0.27, 0.32, 0.27], [0, 0.1, -0.02], { taper: [1.25, 1.15] })],
};

const JOINTS = (kind) => {
  const j = humanoidJoints(kind === 'arch' ? 1.02 : 1);
  if (kind === 'arch') j.push({ name: 'censer', parent: 'handR', pos: [0, -0.08, 0.02] });
  return j;
};

// ------------------------------------------------------------ las poses
const KN = { root: [0, -0.41, 0], legL: [-4, 0, 5], shinL: [92, 0, 0], legR: [-4, 0, -5], shinR: [92, 0, 0], footL: [-10, 0, 0], footR: [-10, 0, 0] };
export const POSES = {
  stand: {},
  kneel: { ...KN, chest: [4, 0, 0], head: [8, 0, 0] },
  pray: { ...KN, chest: [8, 0, 0], head: [16, 0, 0], armL: [-42, -20, 18], foreL: [-88, 0, -10], armR: [-42, 20, -18], foreR: [-88, 0, 10] },
  bow: { ...KN, chest: [42, 0, 0], head: [26, 0, 0], armL: [-24, 0, 8], foreL: [-30, 0, 0], armR: [-24, 0, -8], foreR: [-30, 0, 0] },
  reach: { ...KN, chest: [58, 0, 0], head: [8, 0, 0], armL: [-72, 0, 8], foreL: [-12, 0, 0], armR: [-72, 0, -8], foreR: [-12, 0, 0] },
  raise: { chest: [-6, 0, 0], head: [-18, 0, 0], armR: [-168, 0, -10], foreR: [-8, 0, 0] },
  lookUp: { chest: [-6, 0, 0], head: [-34, 0, 0] },
  // de rodillas, con los brazos en alto: la ofrenda
  kraise: { ...KN, chest: [-8, 0, 0], head: [-22, 0, 0], armL: [-148, 0, 22], foreL: [-12, 0, 0], armR: [-148, 0, -22], foreR: [-12, 0, 0] },
  sing: { chest: [-5, 0, 0], head: [-24, 0, 0], armL: [-24, 0, 32], foreL: [-22, 0, 0], armR: [-24, 0, -32], foreR: [-22, 0, 0] },
  pull: { root: [0, -0.1, -0.12], chest: [-20, 0, 0], head: [-6, 0, 0], armL: [-78, 0, 12], foreL: [-28, 0, 0], armR: [-78, 0, -12], foreR: [-28, 0, 0], legL: [-28, 0, 0], shinL: [30, 0, 0], legR: [8, 0, 0], shinR: [10, 0, 0] },
  carveUp: { chest: [8, 0, 0], head: [10, 0, 0], armR: [-128, 0, -14], foreR: [-72, 0, 0], armL: [-62, 0, 10], foreL: [-34, 0, 0] },
  carveHit: { chest: [14, 0, 0], head: [14, 0, 0], armR: [-72, 0, -10], foreR: [-28, 0, 0], armL: [-62, 0, 10], foreL: [-34, 0, 0] },
  // (de rodillas, a la altura del frente del ara)
  kcarveUp: { ...KN, chest: [22, 0, 0], head: [12, 0, 0], armR: [-112, 0, -16], foreR: [-58, 0, 0], armL: [-58, 0, 12], foreL: [-30, 0, 0] },
  kcarveHit: { ...KN, chest: [28, 0, 0], head: [16, 0, 0], armR: [-58, 0, -10], foreR: [-36, 0, 0], armL: [-58, 0, 12], foreL: [-30, 0, 0] },
  cover: { ...KN, chest: [24, 0, 0], head: [30, 0, 0], armL: [-80, 0, 24], foreL: [-112, 0, -40], armR: [-80, 0, -24], foreR: [-112, 0, 40] },
  turnL: { chest: [0, 22, 0], head: [0, 52, 0] },
  turnR: { chest: [0, -22, 0], head: [0, -52, 0] },
  staff: { armL: [-32, 0, 10], foreL: [-58, 0, 0], armR: [-30, 0, -8], foreR: [-30, 0, 0] },
  lantern: { armL: [-32, 0, 10], foreL: [-58, 0, 0], armR: [-58, 0, -6], foreR: [-20, 0, 0] },
  spear: { armR: [-28, 0, -10], foreR: [-62, 0, 0], armL: [-34, 0, 18], foreL: [-62, 0, -24] },
  shield: { armR: [-28, 0, -10], foreR: [-62, 0, 0], armL: [-52, 0, 28], foreL: [-78, 0, -36] },
  limp: { chest: [10, 0, 0], head: [22, 0, 0], armL: [0, 0, 4], armR: [0, 0, -4] },
};
const JN = ['root', 'hips', 'chest', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'legR', 'shinR', 'footL', 'footR', 'censer'];
function toRad(p) {
  const o = {};
  for (const j of JN) {
    const v = p[j];
    if (!v) o[j] = [0, 0, 0];
    else o[j] = j === 'root' ? v.slice() : v.map((x) => x * DEG);
  }
  return o;
}

// ------------------------------------------------------------ el eco
let SEED = 1;
export class Ghost {
  constructor(game, kind, o = {}) {
    this.g = game;
    this.kind = kind;
    this.seed = SEED++ * 0.37;
    this.mat = ghostMat(o.color, this.seed);
    this.rig = new Rig({ joints: JOINTS(kind), parts: DEFS[kind]() }, { matFn: () => this.mat });
    this.root = this.rig.root;
    // antes que la luz, sólo la profundidad (con el mismo fundido): así de
    // cada figura se ve la cáscara de fuera, y no las piezas de dentro unas
    // a través de otras
    this.dmat = new THREE.ShaderMaterial({ uniforms: this.mat.uniforms, vertexShader: this.mat.vertexShader, fragmentShader: this.mat.fragmentShader, fog: true, transparent: true, colorWrite: false, depthWrite: true });
    for (const m of this.rig.meshes) {
      m.frustumCulled = false;
      m.renderOrder = 3;
      const d = new THREE.Mesh(m.geometry, this.dmat);
      d.frustumCulled = false;
      d.renderOrder = 2;
      m.add(d);
    }
    // un halo alrededor, en el pecho (lo tapa la propia figura: queda el
    // resplandor del contorno)
    this.halo = new THREE.Sprite(additiveFog(new THREE.SpriteMaterial({ map: getTexture('glow'), color: this.mat.uniforms.uColor.value.clone(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })));
    this.halo.scale.set(1.9, 2.3, 1);
    this.halo.position.set(0, 0.1, 0.05);
    this.halo.renderOrder = 3;
    this.halo.frustumCulled = false;
    this.rig.joints.chest.add(this.halo);
    this.root.visible = false;
    game.scene.add(this.root);
    this.cur = toRad(POSES[o.pose || 'stand']);
    this.from = this.cur;
    this.to = this.cur;
    this.k = 1;
    this.dur = 0;
    this.fade = 0;
    this.fadeTo = 0;
    this.fadeRate = 1;
    this.t = Math.random() * 10;
    this.walk = null;
    this.ph = 0;
    this.swing = 0; // el incensario
    this.moteT = 0;
    this.motes = o.motes ?? true;
    this._p = {};
  }
  at(x, y, z, yaw = 0) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    return this;
  }
  face(x, z) {
    const p = this.root.position;
    this.root.rotation.y = Math.atan2(x - p.x, z - p.z);
    return this;
  }
  pose(name, dur = 0.8) {
    this.from = this.cur;
    this.to = toRad(typeof name === 'string' ? POSES[name] : name);
    this.k = dur > 0 ? 0 : 1;
    this.dur = dur;
    if (dur <= 0) this.cur = this.to;
    return this;
  }
  show(dur = 1.4) {
    this.fadeTo = 1;
    this.fadeRate = 1 / Math.max(0.01, dur);
    if (dur <= 0) this.fade = 1;
    return this;
  }
  hide(dur = 1.4) {
    this.fadeTo = 0;
    this.fadeRate = 1 / Math.max(0.01, dur);
    if (dur <= 0) this.fade = 0;
    return this;
  }
  // andar hasta (x, z) a v m/s, mirando hacia donde va
  walkTo(x, z, v = 0.9, y = null) {
    const p = this.root.position;
    this.walk = { x, z, y: y ?? p.y, v };
    return this;
  }
  color(c) {
    this.mat.uniforms.uColor.value.setRGB(c[0], c[1], c[2]);
    this.halo.material.color.setRGB(c[0], c[1], c[2]);
    return this;
  }
  get done() {
    return !this.walk;
  }
  update(dt) {
    this.t += dt;
    if (this.fade !== this.fadeTo) {
      const s = this.fadeRate * dt;
      this.fade = this.fadeTo > this.fade ? Math.min(this.fadeTo, this.fade + s) : Math.max(this.fadeTo, this.fade - s);
    }
    this.mat.uniforms.uFade.value = this.fade;
    this.mat.uniforms.uBase.value = this.root.position.y;
    this.halo.material.opacity = 0.16 * this.fade * this.mat.uniforms.uGain.value;
    this.root.visible = this.fade > 0.002;
    if (!this.root.visible) return;
    // la pose
    if (this.k < 1) {
      this.k = Math.min(1, this.k + dt / this.dur);
      const u = this.k * this.k * (3 - 2 * this.k);
      const c = {};
      for (const j of JN) {
        if (j === 'root') c.root = this.from.root.map((v, i) => v + (this.to.root[i] - v) * u);
        else c[j] = slerpE(this.from[j], this.to[j], u, [0, 0, 0]);
      }
      this.cur = c;
    }
    const P = this._p;
    for (const j of JN) P[j] = this.cur[j].slice();
    // el paso
    let moving = 0;
    if (this.walk) {
      const W = this.walk,
        p = this.root.position;
      const dx = W.x - p.x,
        dz = W.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.03) this.walk = null;
      else {
        const s = Math.min(d, W.v * dt);
        p.x += (dx / d) * s;
        p.z += (dz / d) * s;
        p.y += (W.y - p.y) * Math.min(1, dt * 3);
        this.root.rotation.y = Math.atan2(dx, dz);
        moving = 1;
        this.ph += dt * W.v * 3.4;
      }
    }
    if (moving) {
      const s = Math.sin(this.ph),
        c = Math.cos(this.ph);
      P.legL[0] += -s * 0.42;
      P.legR[0] += s * 0.42;
      P.shinL[0] += Math.max(0, c) * 0.55;
      P.shinR[0] += Math.max(0, -c) * 0.55;
      P.armL[0] += s * 0.22;
      P.armR[0] += -s * 0.22;
      P.root[1] += -Math.abs(c) * 0.025;
    }
    // la respiración
    P.chest[0] += Math.sin(this.t * 1.3) * 0.025;
    P.head[0] += Math.sin(this.t * 0.9 + 1) * 0.02;
    // el incensario se mece colgado de su cadena
    if (this.kind === 'arch') {
      this.swing += dt;
      P.censer = [Math.sin(this.swing * 2.2) * 0.45 - P.foreR[0] - P.armR[0], 0, Math.sin(this.swing * 1.1) * 0.12];
    }
    this.rig.apply(P, P.root);
    // la ceniza que se le va (más cuando se deshace)
    if (this.motes && this.fade > 0.05) {
      this.moteT -= dt * (this.fadeTo < this.fade ? 4 : 1);
      if (this.moteT <= 0) {
        this.moteT = 0.25 + Math.random() * 0.4;
        const r = this.root.position;
        this.g.fx.blood.emit(r.x + (Math.random() - 0.5) * 0.5, r.y + 0.4 + Math.random() * 1.3, r.z + (Math.random() - 0.5) * 0.5, 1, { color: [0.95, 0.82, 0.6], speed: 0.15, life: 1.8, up: 0.5, gravity: -0.3 });
      }
    }
  }
  dispose() {
    this.g.scene.remove(this.root);
    for (const m of this.rig.meshes) m.geometry.dispose();
    this.mat.dispose();
    this.dmat.dispose();
    this.halo.material.dispose();
  }
}
