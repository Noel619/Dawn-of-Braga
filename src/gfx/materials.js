// Materiales "PSX": Lambert de three.js parcheado con
//  - vértices ajustados a una rejilla de pantalla (temblor característico)
//  - mapeo de textura afín parcial (deformación de PS1)
//  - carne palpitante (desplazamiento + emisión pulsante) para la corrupción
import * as THREE from 'three';
import { getTexture } from './textures.js';

export const G = {
  uTime: { value: 0 },
  uSnap: { value: new THREE.Vector2(0, 0) }, // 0 = sin temblor de vértices
  uAffine: { value: 0 },
  // cielo compartido con la composición: la niebla toma el color del cielo en
  // la dirección de la vista, así la geometría lejana se funde con él y el
  // plano lejano nunca se nota
  uSkyGlow: { value: 1 },
  uSun: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.15, 0.12, -1) },
};

// Color del cielo (espacio lineal) en la dirección rd; idéntico al de post.js.
export const SKY_GLSL = `
vec3 skyColor(vec3 fogC, vec3 rd){
  float up = clamp(rd.y, 0.0, 1.0);
  vec3 zen = fogC * vec3(0.34, 0.36, 0.42);
  vec3 glow = vec3(0.35, 0.12, 0.05) * uSkyGlow * (1.0 - smoothstep(0.0, 0.25, up));
  vec3 c = mix(fogC + glow, zen, smoothstep(0.02, 0.75, up));
  if (uSun > 0.0) {
    float sd = max(dot(rd, normalize(uSunDir)), 0.0);
    c += vec3(1.0, 0.72, 0.42) * (pow(sd, 18.0) * 0.45 + pow(sd, 4.0) * 0.12) * uSun;
  }
  return c;
}`;

// uv: repeticiones de textura por metro (mapeo en espacio mundo).
export const MAT_DEFS = {
  cobble: { tex: 'cobble', uv: 0.5 },
  flag: { tex: 'flag', uv: 0.5 },
  wallstone: { tex: 'wallstone', uv: 0.5 },
  ashlar: { tex: 'ashlar', uv: 0.36 },
  plaster: { tex: 'plaster', uv: 0.42 },
  timber: { tex: 'timber', uv: 1.2 },
  planks: { tex: 'planks', uv: 0.6 },
  wooddark: { tex: 'wooddark', uv: 0.5 },
  roof: { tex: 'roof', uv: 0.55 },
  dirt: { tex: 'dirt', uv: 0.3 },
  iron: { tex: 'iron', uv: 1.2 },
  bronze: { tex: 'bronze', uv: 1.0 },
  bronzeAged: { tex: 'bronzeAged', uv: 0.8 },
  // el interior de una campana: bronce ennegrecido
  bronzeIn: { tex: 'bronze', uv: 1.0, color: 0x3c3128 },
  rope: { tex: 'rope', uv: 2.2 },
  // la Plañidera: mortaja y encaje con un leve fulgor frío, piel de muerta
  shroud: { tex: 'shroud', uv: 1.2, emissive: 0x7f94b8, emissiveIntensity: 0.16 },
  lace: { tex: 'lace', uv: 3.0, emissive: 0x7f94b8, emissiveIntensity: 0.12 },
  skinPale: { tex: 'skinPale', uv: 2.0 },
  mossstone: { tex: 'mossstone', uv: 0.5 },
  rock: { tex: 'rock', uv: 0.9 },
  grass: { tex: 'grass', uv: 0.35 },
  leaves: { tex: 'leaves', uv: 0.9 },
  skulls: { tex: 'skulls', uv: 0.55 },
  mosaic: { tex: 'mosaic', uv: 0.2 },
  bone: { tex: 'bone', uv: 1.6 },
  straw: { tex: 'straw', uv: 1.0 },
  burlap: { tex: 'burlap', uv: 1.4 },
  clothRed: { tex: 'clothRed', uv: 1.4 },
  clothDark: { tex: 'clothDark', uv: 1.4 },
  clothBlue: { tex: 'clothBlue', uv: 1.4 },
  clothWhite: { tex: 'clothWhite', uv: 1.4 },
  leather: { tex: 'leather', uv: 1.6 },
  chainmail: { tex: 'chainmail', uv: 2.2 },
  plate: { tex: 'plate', uv: 1.6 },
  // armadura vieja del Empalado: acero ennegrecido con brillo de metal
  plateRust: { tex: 'plateRust', uv: 1.4, phong: { specular: 0x5a5450, shininess: 22 } },
  mailRust: { tex: 'mailRust', uv: 2.0 },
  skin: { tex: 'skin', uv: 2.0 },
  skinCorrupt: { tex: 'skinCorrupt', uv: 1.6 },
  hide: { tex: 'hide', uv: 1.4, phong: { specular: 0x3a2a2a, shininess: 16 } },
  flesh: {
    tex: 'flesh',
    uv: 0.7,
    emissiveTex: 'fleshEmit',
    emissive: 0xff6a3a,
    emissiveIntensity: 0.45,
    flesh: true,
    // brillo húmedo
    phong: { specular: 0x6a3a38, shininess: 38 },
  },
  fleshStatic: { tex: 'flesh', uv: 0.7, emissiveTex: 'fleshEmit', emissive: 0xff5a30, emissiveIntensity: 0.35, phong: { specular: 0x5a3232, shininess: 30 } },
  // los colosos (carne esculpida, sin UV: triplanar en el espacio del cuerpo).
  // También los usan las propuestas archivadas (archive/colosos_propuestas/):
  // colTordo, colMane, mane y colDough sólo las usan ellas
  // (tras cambiar algo aquí, comprobar que siguen funcionando)
  colFlesh: { tex: 'colFleshTex', uv: 1, tri: 0.2, emissiveTex: 'colFleshEmit', emissive: 0xff6a3a, emissiveIntensity: 0.6, phong: { specular: 0x6a3a38, shininess: 30 }, giant: { amp: 0.1, freq: 0.3, speed: 1 } },
  colSkin: { tex: 'colSkin', uv: 1, tri: 0.3, phong: { specular: 0x3a3430, shininess: 14 } },
  colDough: { tex: 'doughTex', uv: 1, tri: 0.16, phong: { specular: 0x705050, shininess: 22 } },
  colFleshDim: { tex: 'colFleshTex', uv: 1, tri: 0.14, emissiveTex: 'colFleshEmit', emissive: 0xff5a30, emissiveIntensity: 0.22, phong: { specular: 0x6a3a38, shininess: 30 }, giant: { amp: 0.25, freq: 0.08, speed: 0.6 } },
  colRobe: { tex: 'velvetRed', uv: 1, tri: 0.45, phong: { specular: 0x502020, shininess: 12 } },
  colAlb: { tex: 'albTex', uv: 1, tri: 0.3 },
  colRobeDark: { tex: 'clothDark', uv: 1, tri: 0.55 },
  colRobeWhite: { tex: 'albTex', uv: 1, tri: 0.45 },
  colRobePurple: { tex: 'clothPurple', uv: 1, tri: 0.55 },
  colOrphrey: { tex: 'orphrey', uv: 1, tri: 0.6, phong: { specular: 0x806030, shininess: 26 } },
  colTordo: { tex: 'tordo', uv: 1, tri: 0.22 },
  colMane: { tex: 'mane', uv: 1, tri: 0.5 },
  clothPurple: { tex: 'clothPurple', uv: 1.4 },
  mane: { tex: 'mane', uv: 1.0 },
  colBronze: { tex: 'bronzeAged', uv: 1, tri: 0.12, phong: { specular: 0x806040, shininess: 30 } },
  colHide: { tex: 'hide', uv: 1, tri: 0.26, phong: { specular: 0x3a2a2a, shininess: 16 } },
  colBone: { tex: 'bone', uv: 1, tri: 0.45 },
  // sigilo del Pacto (punto débil de un coloso): la textura arde
  colSigil: { tex: 'sigil', uv: 1, emissiveTex: 'sigil', emissive: 0xffc070, emissiveIntensity: 2.2 },
  glass: { tex: 'glass', uv: 0.5, emissiveTex: 'glass', emissive: 0xffffff, emissiveIntensity: 1.3 },
  candle: { tex: 'candle', uv: 2.0, emissive: 0x3a2a10, emissiveIntensity: 1 },
  blood: { tex: 'blood', uv: 0.5 },
  water: { tex: 'water', uv: 0.25 },
  black: { tex: 'black', uv: 1, color: 0x050505 },
  // metales de las armas
  silver: { tex: 'plate', uv: 1.6, color: 0xe4e6ee },
  gold: { tex: 'bronze', uv: 1.0, color: 0xffd67a },
  holySteel: { tex: 'plate', uv: 1.6, color: 0xf4f1ea, emissive: 0xffdf9a, emissiveIntensity: 0.3 },
  lacquer: { tex: 'wooddark', uv: 0.8, color: 0x3a1410 },
  ember: { tex: 'white', uv: 1, color: 0x220800, emissive: 0xff5a10, emissiveIntensity: 1.6 },
  eyeGlow: { tex: 'white', uv: 1, color: 0x000000, emissive: 0xffc070, emissiveIntensity: 2.2 },
  redGlow: { tex: 'white', uv: 1, color: 0x100000, emissive: 0xff2010, emissiveIntensity: 2.0 },
  eyeCold: { tex: 'white', uv: 1, color: 0x000000, emissive: 0xbfd8ff, emissiveIntensity: 2.4 },
};

const matCache = new Map();

function patch(material, opts = {}) {
  const flesh = !!opts.flesh;
  const bake = !!opts.bake;
  const wind = !!opts.wind;
  // personajes y objetos móviles: reciben la luz horneada del lugar donde
  // están (sonda) y oscurecen cerca del suelo como el escenario; así no
  // parecen recortados sobre el fondo
  const probe = !!opts.probe;
  // tri: texturizado triplanar (repeticiones por metro) en el espacio del
  // objeto en reposo: para mallas orgánicas sin UV (los colosos); la textura
  // se queda pegada a la carne aunque la malla se deforme (piel con huesos)
  const tri = opts.tri || 0;
  // giant: carne palpitante a escala de coloso ({ amp: metros, freq: 1/m,
  // speed }): el latido sigue al cuerpo (espacio del objeto), no al mundo
  const giant = opts.giant || null;
  material.userData.patch = { flesh, bake, wind, probe, tri, giant };
  if (probe) material._u = { uProbe: { value: new THREE.Vector3() }, uGround: { value: new THREE.Vector2(0, 0) } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = G.uTime;
    shader.uniforms.uSnap = G.uSnap;
    shader.uniforms.uAffine = G.uAffine;
    shader.uniforms.uSkyGlow = G.uSkyGlow;
    shader.uniforms.uSun = G.uSun;
    shader.uniforms.uSunDir = G.uSunDir;
    if (probe) {
      shader.uniforms.uProbe = material._u.uProbe;
      shader.uniforms.uGround = material._u.uGround;
    }
    let vs = shader.vertexShader;
    vs = vs.replace(
      '#include <common>',
      `#include <common>
uniform float uTime;
uniform vec2 uSnap;
varying vec3 vAffUv;
varying float vPulse;
varying vec3 vSkyDir;
${probe ? 'varying float vWY;' : ''}
${tri ? 'varying vec3 vTriP;\nvarying vec3 vTriN;' : ''}
${bake ? 'attribute vec3 aBake;\nvarying vec3 vBake;' : ''}`
    );
    vs = vs.replace(
      '#include <fog_vertex>',
      `#include <fog_vertex>
vSkyDir = transpose(mat3(viewMatrix)) * mvPosition.xyz;
${probe ? 'vWY = (modelMatrix * vec4(transformed, 1.0)).y;' : ''}`
    );
    vs = vs.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vPulse = 0.0;
${bake ? 'vBake = aBake;' : ''}
${tri ? `vTriP = position * ${tri.toFixed(5)};\nvTriN = normal;` : ''}
${wind ? `{
  float sway = 1.0 - uv.y;
  transformed += objectNormal * (sin(uTime * 2.3 + position.y * 1.7 + position.x * 0.9) * 0.12 + sin(uTime * 5.1 + position.y * 4.0) * 0.03) * sway;
}` : ''}
${
  flesh
    ? `{
  vec4 wp0 = modelMatrix * vec4(position, 1.0);
  float ph = sin(uTime * 2.1 + wp0.x * 1.7 + wp0.y * 2.6 + wp0.z * 1.3);
  float ph2 = sin(uTime * 4.2 + wp0.x * 3.1 - wp0.z * 2.2);
  vPulse = ph * 0.5 + 0.5;
  transformed += objectNormal * (ph * 0.045 + ph2 * 0.015);
}`
    : ''
}
${
  giant
    ? `{
  vec3 gp = position * ${(giant.freq ?? 0.25).toFixed(4)};
  float sp = ${(giant.speed ?? 1).toFixed(3)};
  float ph = sin(uTime * 1.3 * sp + gp.x * 1.7 + gp.y * 2.3 + gp.z * 1.1);
  float ph2 = sin(uTime * 2.9 * sp + gp.x * 3.1 - gp.z * 2.6 + gp.y * 0.7);
  vPulse = ph * 0.5 + 0.5;
  transformed += normal * (ph * ${(giant.amp ?? 0.2).toFixed(4)} + ph2 * ${((giant.amp ?? 0.2) * 0.3).toFixed(4)});
}`
    : ''
}`
    );
    vs = vs.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>`
    );
    vs = vs.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
{
  vec2 s = uSnap * 0.5;
  vec4 p = gl_Position;
  if (uSnap.x > 0.0 && p.w > 0.05) {
    p.xy = floor(p.xy / p.w * s + 0.5) / s * p.w;
    gl_Position = p;
  }
#ifdef USE_MAP
  vAffUv = vec3(vMapUv * gl_Position.w, gl_Position.w);
#else
  vAffUv = vec3(0.0, 0.0, 1.0);
#endif
}`
    );
    shader.vertexShader = vs;

    let fs = shader.fragmentShader;
    fs = fs.replace(
      '#include <common>',
      `#include <common>
uniform float uAffine;
uniform float uTime;
uniform float uSkyGlow;
uniform float uSun;
uniform vec3 uSunDir;
varying vec3 vAffUv;
varying float vPulse;
varying vec3 vSkyDir;
${bake ? 'varying vec3 vBake;' : ''}
${probe ? 'uniform vec3 uProbe;\nuniform vec2 uGround;\nvarying float vWY;' : ''}
${tri ? `varying vec3 vTriP;
varying vec3 vTriN;
vec4 triSample(sampler2D t){
  vec3 bw = pow(abs(normalize(vTriN)), vec3(4.0));
  bw /= (bw.x + bw.y + bw.z);
  return texture2D(t, vTriP.yz) * bw.x + texture2D(t, vTriP.zx + 0.37) * bw.y + texture2D(t, vTriP.xy + 0.71) * bw.z;
}` : ''}
${SKY_GLSL}`
    );
    fs = fs.replace(
      '#include <fog_fragment>',
      `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, skyColor(fogColor, normalize(vSkyDir)), fogFactor );
#endif`
    );
    fs = fs.replace(
      '#include <map_fragment>',
      tri
        ? `#ifdef USE_MAP
  diffuseColor *= triSample(map);
#endif`
        : `#ifdef USE_MAP
  vec2 muv = mix(vMapUv, vAffUv.xy / vAffUv.z, uAffine);
  vec4 sampledDiffuseColor = texture2D(map, muv);
  diffuseColor *= sampledDiffuseColor;
#endif`
    );
    if (tri)
      fs = fs.replace(
        '#include <emissivemap_fragment>',
        `#ifdef USE_EMISSIVEMAP
  totalEmissiveRadiance *= triSample(emissiveMap).rgb;
#endif`
      );
    if (bake) {
      fs = fs.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
reflectedLight.indirectDiffuse += diffuseColor.rgb * vBake;`
      );
    }
    if (probe) {
      // oclusión de contacto (más oscuro junto a los pies) + luz horneada del sitio
      fs = fs.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.rgb *= 1.0 - uGround.y * (1.0 - smoothstep(0.0, 1.25, vWY - uGround.x));`
      );
      fs = fs.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
reflectedLight.indirectDiffuse += diffuseColor.rgb * uProbe;`
      );
    }
    if (flesh || giant) {
      fs = fs.replace(
        tri ? 'totalEmissiveRadiance *= triSample(emissiveMap).rgb;\n#endif' : '#include <emissivemap_fragment>',
        `${tri ? 'totalEmissiveRadiance *= triSample(emissiveMap).rgb;\n#endif' : '#include <emissivemap_fragment>'}
totalEmissiveRadiance *= 0.35 + 0.95 * vPulse * vPulse;`
      );
    }
    shader.fragmentShader = fs;
  };
  const ck = 'psx' + (flesh ? '-flesh' : '') + (bake ? '-bake' : '') + (wind ? '-wind' : '') + (probe ? '-probe' : '') + (tri ? '-tri' + tri : '') + (giant ? '-giant' + [giant.amp, giant.freq, giant.speed].join(',') : '');
  material.customProgramCacheKey = () => ck;
  return material;
}

// Copia de un material conservando el parche PSX (Material.clone() no copia
// onBeforeCompile: el clon perdía la niebla con color de cielo y resaltaba
// en la niebla como una silueta recortada).
export function cloneMat(m) {
  const c = m.clone();
  c.userData.def = m.userData.def;
  const p = m.userData.patch;
  if (p) patch(c, { ...p, probe: p.probe || (!p.bake && !(c.isMeshBasicMaterial)) });
  return c;
}

function build(name, { vertexColors = true, side = THREE.FrontSide, basic = false, bake = null, probe = false, tri = 0, giant = null } = {}) {
  const def = MAT_DEFS[name];
  if (!def) throw new Error('Material desconocido: ' + name);
  const params = {
    map: getTexture(def.tex),
    vertexColors,
    side,
  };
  if (def.color !== undefined) params.color = def.color;
  let m;
  if (basic) {
    m = new THREE.MeshBasicMaterial(params);
  } else {
    if (def.emissive !== undefined) {
      params.emissive = new THREE.Color(def.emissive);
      params.emissiveIntensity = def.emissiveIntensity ?? 1;
      if (def.emissiveTex) params.emissiveMap = getTexture(def.emissiveTex);
    }
    m = def.phong ? new THREE.MeshPhongMaterial({ ...params, specular: new THREE.Color(def.phong.specular), shininess: def.phong.shininess }) : new THREE.MeshLambertMaterial(params);
  }
  m.userData.def = def;
  return patch(m, { flesh: def.flesh && !giant, bake: bake ?? (vertexColors && !basic), probe, tri, giant });
}

// Material de mundo (con colores de vértice horneados).
export function worldMat(name) {
  const key = 'w:' + name;
  if (!matCache.has(key)) matCache.set(key, build(name, { vertexColors: true }));
  return matCache.get(key);
}

// Material para personajes/objetos dinámicos (sin colores de vértice).
export function objMat(name, opts = {}) {
  const key = 'o:' + name + (opts.side === THREE.DoubleSide ? ':ds' : '') + (opts.tint ? ':' + opts.tint : '');
  if (!matCache.has(key)) {
    const m = build(name, { vertexColors: false, side: opts.side });
    if (opts.tint) m.color = new THREE.Color(opts.tint);
    matCache.set(key, m);
  }
  return matCache.get(key);
}

// Material de coloso: colores de vértice (oclusión y matices esculpidos), luz
// horneada del sitio (sonda), triplanar opcional y carne a escala colosal.
// opts: { tri (repeticiones/m; 0 = usa las UV), giant, side, tint }
export function colMat(name, opts = {}) {
  const def = MAT_DEFS[name];
  if (!def) throw new Error('Material desconocido: ' + name);
  const tri = opts.tri ?? def.tri ?? 0;
  const giant = opts.giant === undefined ? def.giant || null : opts.giant;
  const key = 'col:' + name + ':' + tri + ':' + (giant ? JSON.stringify(giant) : '') + (opts.side === THREE.DoubleSide ? ':ds' : '') + (opts.tint ? ':' + opts.tint : '');
  if (!matCache.has(key)) {
    const m = build(name, { vertexColors: true, side: opts.side, bake: false, probe: true, tri, giant });
    if (opts.tint) m.color = new THREE.Color(opts.tint);
    matCache.set(key, m);
  }
  return matCache.get(key);
}

// Materiales especiales -----------------------------------------------------

// Material de sprite/decal con recorte alfa y parche PSX.
export function cutoutMat(texName, { color = 0xffffff, side = THREE.DoubleSide, lit = true, alphaTest = 0.5 } = {}) {
  const key = 'c:' + texName + ':' + color + ':' + lit + ':' + side;
  if (matCache.has(key)) return matCache.get(key);
  const P = { map: getTexture(texName), alphaTest, side, color, transparent: false };
  const m = lit ? new THREE.MeshLambertMaterial(P) : new THREE.MeshBasicMaterial(P);
  patch(m);
  matCache.set(key, m);
  return m;
}

// Decal transparente sobre el suelo (sangre, sombras).
export function decalMat(texName, { opacity = 1, color = 0xffffff, blending = THREE.NormalBlending } = {}) {
  const key = 'd:' + texName + ':' + opacity + ':' + color + ':' + blending;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshBasicMaterial({
    map: getTexture(texName),
    transparent: true,
    opacity,
    depthWrite: false,
    color,
    blending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  matCache.set(key, m);
  return m;
}

export function registerMaterialPatch(material, opts) {
  return patch(material, opts);
}

// Brillos aditivos (halos, orbes, llamas en sprite): la niebla los apaga en
// vez de teñirlos de su color. Mezclados hacia el color de la niebla y sumados
// a la escena, a lo lejos quedaban como manchas grises que se veían a través
// de la niebla.
export function additiveFog(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb *= 1.0 - fogFactor;
#endif`
    );
  };
  material.customProgramCacheKey = () => 'addfog';
  return material;
}
