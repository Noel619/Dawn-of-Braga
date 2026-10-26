// Catedral de Braga, claustro, cripta (osario, templo romano, sepulcro),
// cisterna del jefe final, galería y orillas del río.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, stairs, merlons, cityWall, belfryTower, archWall, stoneWall, archRing, archedWall, barrelVault, rampVault, lunette, pilaster, beam, solidGableRoof } from './builders.js';
import * as P from './props.js';
import { floor } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { BELL_OUT, BELL_IN } from '../entities/enemy_models.js';
import { bakeParts, skullParts, boneParts } from './ossuary_props.js';
import { NAVE, naveSec, naveBreaks, CISTERN } from './level_finale.js';
import { buildSanctum } from './sanctum.js';

const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Una campana de verdad, con el perfil de la del Campanero (k = 1: 0,93 m de
// boca): por fuera bronce viejo, por dentro ennegrecido, y la corona de asas.
// m: dónde y cómo, con la boca en y = 0 y la corona hacia +y.
export function churchBell(ctx, m, k, o = {}) {
  const wb = ctx.wb;
  const lathe = (P) => new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r * k, (y - 0.1) * k)), 16);
  wb.geometry('bronzeAged', lathe(BELL_OUT), m, { ao: false, ...o });
  wb.geometry('bronzeIn', lathe(BELL_IN), m, { ao: false, ...o });
  for (const ry of [0, Math.PI / 2]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0));
    wb.geometry('bronzeAged', new THREE.TorusGeometry(0.085 * k, 0.024 * k, 4, 10), m.clone().multiply(new THREE.Matrix4().compose(V(0, 0.805 * k, 0), q, V(1, 1, 1))), { ao: false, ...o });
  }
}

// Vidriera (caja de vidrio emisivo) + luz roja horneada hacia dentro.
function lancet(ctx, x, z, face, y0 = 6, h = 5, w = 1.3, room = 'cathedral') {
  const wb = ctx.wb;
  const t = 0.04;
  if (face === 'x') {
    wb.box('glass', x - t, y0, z - w / 2, x + t, y0 + h, z + w / 2, { ao: false, grime: false, faces: 'ew', uv: 0.6 });
    // arco apuntado aproximado
    wb.box('glass', x - t, y0 + h, z - w * 0.3, x + t, y0 + h + 0.5, z + w * 0.3, { ao: false, grime: false, faces: 'ew', uv: 0.6 });
    wb.box('ashlar', x - 0.15, y0 - 0.2, z - w / 2 - 0.2, x + 0.15, y0, z + w / 2 + 0.2, { ao: false });
  } else {
    wb.box('glass', x - w / 2, y0, z - t, x + w / 2, y0 + h, z + t, { ao: false, grime: false, faces: 'ns', uv: 0.6 });
    wb.box('glass', x - w * 0.3, y0 + h, z - t, x + w * 0.3, y0 + h + 0.5, z + t, { ao: false, grime: false, faces: 'ns', uv: 0.6 });
  }
}

// Las ruinas de la fachada (grupo 'fachadaRuin', ocultas hasta que Deo Ignoto
// se desploma sobre el atrio): de las torres quedan los muñones de fuera (la
// cabeza del dios cae entre los dos), montones de sillares, el rosetón roto,
// la campana de la torre este y trozos de los chapiteles. Por el medio queda
// una brecha para entrar en la nave.
function facadeRuin(ctx, FY) {
  const wb = ctx.wb;
  const rr = new RNG(5151);
  const RT = [0.76, 0.72, 0.68];
  ctx.beginGroup('fachadaRuin');
  // los muñones de las torres, con la cima rota en dientes
  for (const sg of [-1, 1]) {
    const xo = sg * 13,
      xi = sg * 8.6;
    const x0 = Math.min(xo, xi),
      x1 = Math.max(xo, xi);
    solid(ctx, 'ashlar', x0, 0, -64, x1, 3.2, -56, { sub: 2.2, aoH: 2, tint: RT });
    let z = -64;
    while (z < -56 - 0.01) {
      const w = Math.min(-56 - z, rr.range(0.8, 2.0));
      const h = rr.range(1.2, 6.5) * (rr.chance(0.25) ? 0.35 : 1);
      const inset = rr.range(0, 1.6);
      // (más alto por fuera: la torre se ha partido hacia la plaza y la nave)
      const xa = sg > 0 ? x0 + inset : x0,
        xb = sg > 0 ? x1 : x1 - inset;
      solid(ctx, 'ashlar', xa, 3.2, z, xb, 3.2 + h, z + w, { sub: 2, ao: false, tint: RT, faces: 'tnsew' });
      z += w;
    }
    // la cornisa del primer cuerpo, partida
    wb.box('ashlar', x0 - 0.25, 2.9, -64.25, x1 + 0.25, 3.3, -61.5, { ao: false, faces: 'tnsewb', tint: [0.7, 0.66, 0.62] });
    // escombros al pie (del lado de la plaza y del de dentro)
    P.rubble(ctx, sg * 10.8, 0, -54.4, 14, 5160 + sg, 2.0, { scale: 1.7, mat: 'ashlar', collide: true, h: 0.9 });
    P.rubble(ctx, sg * 6.4, 0, -62.5, 12, 5162 + sg, 1.8, { scale: 1.9, mat: 'ashlar', blocks: 0.8 });
    // un trozo de chapitel caído, con las tejas
    wb.push();
    wb.translate(sg * 11.2, 1.4, -51.6);
    wb.rotateY(sg * 0.7);
    wb.rotateZ(sg * 1.05);
    wb.pyramid('roof', 0, 0, 4.2, 4.2, -1.6, 3.6);
    wb.box('ashlar', -2.25, -2.0, -2.25, 2.25, -1.6, 2.25, { ao: false, faces: 'tnsewb', tint: [0.7, 0.66, 0.62] });
    wb.pop();
    ctx.col.add(sg * 11.2 - 1.8, 0, -53.2, sg * 11.2 + 1.8, 1.6, -50.0);
  }
  // el suelo de la brecha, a la altura de la nave y del pórtico (el umbral
  // de la puerta ya está)
  for (const [x0, x1] of [
    [-5, -1.6],
    [1.6, 5],
  ]) {
    wb.box('flag', x0, 0, -61.5, x1, FY, -60, { faces: 'tnsew', ao: false, tint: [0.8, 0.76, 0.72] });
    ctx.col.add(x0, 0, -61.5, x1, FY, -60);
  }
  // la brecha: escombros bajos (se pasa por encima) y sillares grandes
  P.rubble(ctx, 0, FY, -61.2, 16, 5170, 2.6, { scale: 1.2, mat: 'ashlar', blocks: 0.7 });
  P.rubble(ctx, -2.8, 0, -56.2, 9, 5171, 1.6, { scale: 1.1, mat: 'ashlar' });
  P.rubble(ctx, 3.4, 0, -57.2, 9, 5172, 1.5, { scale: 1.1, mat: 'ashlar' });
  for (const [x, z, s, ry, rx, rz] of [
    [-6.6, -58.2, 1.9, 0.5, 0.3, 0.2],
    [6.9, -59.0, 2.1, -0.4, -0.25, 0.35],
    [-4.4, -52.6, 1.5, 1.1, 0.15, -0.4],
    [5.2, -51.8, 1.4, -0.9, -0.35, 0.1],
    [-13.6, -57.4, 1.6, 0.2, 0.5, 0.1],
    [14.6, -57.8, 1.5, -0.6, 0.2, -0.3],
  ]) {
    wb.push();
    wb.translate(x, s * 0.36, z);
    wb.rotateY(ry);
    wb.rotateX(rx);
    wb.rotateZ(rz);
    wb.box('ashlar', -s * 0.6, -s * 0.4, -s * 0.45, s * 0.6, s * 0.4, s * 0.45, { ao: false, sub: 1.2, tint: [0.84, 0.8, 0.75] });
    wb.pop();
    ctx.col.add(x - s * 0.5, 0, z - s * 0.4, x + s * 0.5, s * 0.75, z + s * 0.4);
  }
  // el rosetón, partido y apoyado contra el muñón de la torre oeste
  wb.push();
  wb.translate(-11.2, 2.3, -55.25);
  wb.rotateX(Math.PI / 2 - 0.32);
  wb.rotateY(0.25);
  wb.cylinder('glass', 0, 0, 0, 2.2, 2.2, 0.05, 12, { ao: false, capTop: true, capBot: true, grime: false });
  wb.cylinder('ashlar', 0, -0.2, 0, 2.5, 2.5, 0.2, 12, { ao: false });
  for (let i = 0; i < 6; i++) {
    wb.push();
    wb.rotateY((i / 6) * Math.PI);
    wb.box('ashlar', -2.2, -0.04, -0.06, 2.2, 0.12, 0.06, { ao: false });
    wb.pop();
  }
  wb.pop();
  // la campana de la torre este, tumbada entre los escombros
  churchBell(ctx, new THREE.Matrix4().makeTranslation(12.4, 1.05, -53.2).multiply(new THREE.Matrix4().makeRotationY(-0.5)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2 - 0.22)).multiply(new THREE.Matrix4().makeTranslation(0, -0.9, 0)), 2.42);
  P.beam(ctx, 9.4, -55.6, 14.8, -52.2, 0.2, 0.18);
  P.beam(ctx, -14.2, -55.4, -9.6, -58.8, 0.6, 0.16);
  // ascuas entre las piedras
  ctx.fires.push({ x: -9.6, y: 0.4, z: -55.2, s: 0.45, light: true, embers: true, glow: true });
  ctx.fires.push({ x: 7.8, y: 0.5, z: -56.6, s: 0.3, light: false, embers: true, glow: true });
  ctx.endGroup();
}

// ======================================================================== CATEDRAL
export function buildCathedral(ctx, S, L) {
  const wb = ctx.wb;
  const room = 'cathedral';
  const FY = 0.6; // altura del suelo interior

  // --- exterior: torres, pórtico (galilé), fachada
  // (en el grupo 'fachada': cuando Deo Ignoto se desploma sobre el atrio la
  // revienta con el pecho; las ruinas, en 'fachadaRuin', más abajo. El suelo
  // del pórtico, la escalinata y el umbral se quedan)
  ctx.beginGroup('fachada');
  // (con el campanario abierto: cuatro machones y un vano en cada cara)
  for (const cx of [-9, 9]) belfryTower(ctx, cx, -60, 8, 24, 17.5, 21, { mat: 'ashlar', vano: 3 });
  // la campana de la torre este, colgada del cabezal (en su grupo: en la
  // introducción la cambia una que se mueve, la noche que tocó sola; ver
  // game/intro)
  wb.box('wooddark', 7.4, 20.55, -60.22, 10.6, 21, -59.78, { ao: false });
  ctx.beginGroup('campanaSe');
  churchBell(ctx, new THREE.Matrix4().makeTranslation(9, 18.2, -60), 2.42);
  wb.box('iron', 8.9, 20.0, -60.1, 9.1, 20.55, -59.9, { ao: false });
  ctx.endGroup();
  ctx.endGroup();
  // pórtico
  W(S, -5, -60, 5, -55);
  ctx.col.add(-5, 0, -60, 5, FY, -56);
  wb.box('flag', -5, 0, -60, 5, FY, -56, { faces: 't', ao: false, room });
  stairs(ctx, 0, 0, -55.1, 'n', 10, 2, 0.3, 0.45, 'ashlar');
  ctx.beginGroup('fachada');
  archWall(ctx, -5, 5, -56.6, -56, 8.5, 0, 6, 6.2, { slices: 10 });
  wb.box('ashlar', -5.2, 8.5, -60, 5.2, 9.2, -56.2, { ao: false, sub: 2 });
  ctx.col.add(-5, 8.5, -60, 5, 9.2, -56);
  wb.box('wooddark', -5, 8.3, -60, 5, 8.5, -56.6, { faces: 'b', ao: false });
  P.wallTorch(ctx, -4.9, 3, -58, 'e');
  P.wallTorch(ctx, 4.9, 3, -58, 'w');
  // fachada con portada (las hojas de la puerta llenan el medio punto: ver
  // d_se, más abajo; antes eran cuadradas, bajo un tímpano de piedra)
  archWall(ctx, -5, 5, -61.5, -60, 18, 0, 3.2, 4.6, { mat: 'ashlar', slices: 8 });
  ctx.endGroup();
  wb.box('ashlar', -1.6, 0, -61.5, 1.6, FY, -60, { faces: 't', ao: false });
  ctx.col.add(-1.6, 0, -61.5, 1.6, FY, -60);
  ctx.beginGroup('fachada');
  // rosetón
  wb.push();
  wb.translate(0, 12.5, -59.95);
  wb.rotateX(Math.PI / 2);
  wb.cylinder('glass', 0, 0, 0, 2.2, 2.2, 0.05, 12, { ao: false, capTop: true, capBot: true, grime: false });
  wb.cylinder('ashlar', 0, -0.2, 0, 2.5, 2.5, 0.2, 12, { ao: false });
  wb.pop();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    wb.push();
    wb.translate(0, 12.5, -59.9);
    wb.rotateZ(a);
    wb.box('ashlar', -2.2, -0.06, -0.06, 2.2, 0.06, 0.06, { ao: false });
    wb.pop();
  }
  P.banner(ctx, 0, 17, -59.85, 0, 'bannerBlack', 2.2, 4.8);
  ctx.endGroup();
  // el grueso del muro de la fachada, transitable: lo cierran sus propios
  // sillares y la puerta (sin esto, la zona sin pintar levantaba un muro
  // invisible y la puerta de la Sé no se podía cruzar ni abierta)
  W(S, -5, -61.5, 5, -60);
  facadeRuin(ctx, FY);

  // --- muros de la nave
  W(S, -11, -104, 11, -61.5);
  // (los muros, en dos: lo de arriba va con el tejado en el grupo 'naveRoof'.
  // En la película del jefe final la nave se rompe por tramos, de norte a
  // sur: el tejado y la bóveda ('naveRoof:k'), los fajones ('naveFaj:i'), las
  // coronas de velas ('naveCrown:i'), las arquerías ('naveArc:k') y los
  // bancos ('naveBancos:i'); sus ruinas, en 'naveRuin:k', 'naveArcRuin:k' y
  // 'naveBancosRuin:i'. Ver NAVE en level_finale.js)
  const { CUT, YV, RV, za, zb, bays, bw } = NAVE;
  // un tramo de z partido por los tramos de la nave: fn(z0, z1, k) dentro
  // del grupo del tramo ('<pre>:k')
  const bySec = (z0, z1, fn, pre = 'naveRoof') => {
    NAVE.secs.forEach(([s0, s1], k) => {
      const a = Math.max(z0, s0),
        b = Math.min(z1, s1);
      if (b - a < 0.01) return;
      ctx.beginGroup(pre + ':' + k);
      fn(a, b, k);
      ctx.endGroup();
    });
  };
  // dentro de varios grupos a la vez (anidados)
  const inG = (names, fn) => {
    for (const n of names) ctx.beginGroup(n);
    fn();
    for (let i = 0; i < names.length; i++) ctx.endGroup();
  };
  const nave = (x0, z0, x1, z1) => {
    solid(ctx, 'ashlar', x0, 0, z0, x1, CUT, z1, { sub: 2.2, aoH: 2 });
    inG(['naveRoof'], () => bySec(z0, z1, (a, b) => solid(ctx, 'ashlar', x0, CUT, a, x1, 14, b, { sub: 2.2, ao: false })));
  };
  nave(-13, -104, -11, -64);
  nave(11, -104, 13, -81);
  nave(11, -79, 13, -64);
  solid(ctx, 'ashlar', 11, 3.2, -81, 13, CUT, -79, { sub: 2, ao: false, faces: 'tnsewb' });
  inG(['naveRoof', 'naveRoof:' + naveSec(-80)], () => solid(ctx, 'ashlar', 11, CUT, -81, 13, 14, -79, { sub: 2, ao: false, faces: 'tnsewb' }));
  // la cabecera: el muro del norte de la nave, con sus vidrieras, y el
  // ábside; el gigante la revienta al meterse en la nave ('cabecera'; sus
  // ruinas, en 'cabeceraRuin')
  inG(['cabecera'], () => {
    solid(ctx, 'ashlar', -13, 0, -108, 13, CUT, -104, { sub: 2.2, aoH: 2 });
    inG(['naveRoof', 'naveRoof:0'], () => solid(ctx, 'ashlar', -13, CUT, -108, 13, 14, -104, { sub: 2.2, ao: false }));
  });
  // (el ábside, aparte: lo pisa antes de reventar el muro: 'abside' y
  // 'absideRuin')
  inG(['abside'], () => {
    solid(ctx, 'ashlar', -7, 0, -112, 7, 12, -108, { sub: 2.2 });
    inG(['naveRoof', 'naveRoof:0'], () => wb.pyramid('roof', 0, -110, 15, 5, 12, 3));
  });
  // (con grueso, alero y tablas de remate: antes, un plano de papel; el
  // hastial de delante, sólo lo que asoma por encima de la fachada)
  inG(['naveRoof'], () =>
    bySec(-108, -60, (a, b, k) =>
      solidGableRoof(ctx, -13, a, 13, b, 14, 20, 'z', { overhang: 0.8, gableOverhang: 0.3, thick: 0.28, wallMat: 'ashlar', wallT: 0.6, gables: [k === 0 ? {} : false, k === 3 ? { y0: 18, t: 1.5 } : false], open: [k > 0, k < 3], room })
    )
  );
  // contrafuertes (lado oeste)
  for (let z = -100; z <= -68; z += 8) solid(ctx, 'ashlar', -14.4, 0, z - 0.6, -13, 11, z + 0.6, { sub: 2 });
  // vidrieras
  for (let z = -98; z <= -70; z += 7) {
    lancet(ctx, -11.02, z, 'x');
    lancet(ctx, -12.98, z, 'x');
    // (por debajo de la viga de las naves laterales)
    lancet(ctx, 11.02, z, 'x', 7.2, 4.4);
    lancet(ctx, 12.98, z, 'x', 7.2, 4.4);
    ctx.lights.push({ x: -9.5, y: 7.5, z, r: 1.0, g: 0.16, b: 0.1, radius: 10, intensity: 0.7, room });
    if (ctx.shafts) {
      ctx.shafts.push({ a: [-11, 9, z], b: [-3.5, 0.6, z + 2.5], w: 1.8, color: 0xff5a40 });
      ctx.shafts.push({ a: [11, 10, z], b: [4.5, 0.6, z - 2], w: 1.5, color: 0x7080e0 });
    }
    ctx.lights.push({ x: 9.5, y: 8.5, z, r: 0.9, g: 0.2, b: 0.2, radius: 10, intensity: 0.5, room });
  }
  inG(['cabecera'], () => {
    lancet(ctx, 0, -103.98, 'z', 5, 7, 2.2);
    if (ctx.shafts) ctx.shafts.push({ a: [0, 9, -103.9], b: [0, 1.2, -95], w: 2.0, color: 0xff3a28 });
    lancet(ctx, -4, -103.98, 'z', 6, 5, 1.2);
    lancet(ctx, 4, -103.98, 'z', 6, 5, 1.2);
  });

  // --- interior
  wb.setRoom(room);
  W(S, -5, -64, 5, -61.5);
  const floorBox = (x0, z0, x1, z1, y = FY) => {
    wb.box('flag', x0, y - 0.3, z0, x1, y, z1, { faces: 't', ao: false, sub: 2.5, room, uv: 0.4 });
    ctx.col.add(x0, 0, z0, x1, y, z1);
  };
  floorBox(-11, -86, 11, -64);
  floorBox(-11, -97, -2, -86);
  floorBox(2, -97, 11, -86);
  floorBox(-11, -104, 11, -97);
  floorBox(-5, -64, 5, -61.5);
  // presbiterio elevado
  stairs(ctx, 0, FY, -99.1, 'n', 16, 2, 0.3, 0.45, 'ashlar');
  wb.box('ashlar', -8, FY, -104, 8, 1.2, -100, { faces: 'tn', ao: false, room });
  ctx.col.add(-8, FY, -104, 8, 1.2, -100);
  // arquerías de la nave (dos filas), cada tramo en su grupo
  // la nave central, cubierta con una bóveda de cañón con sus fajones; las
  // laterales, con techo de vigas; sobre las arquerías, el muro sube hasta el
  // arranque de la bóveda (antes, un techo llano de una sola cara a catorce
  // metros, al que no llegaba la luz: se veía negro, como el vacío)
  const VT = [0.86, 0.83, 0.78],
    FT = [0.94, 0.9, 0.84];
  const arc = (k, fn) => inG(['naveArc:' + k], fn);
  for (const x of [-5.5, 5.5]) {
    for (let i = 0; i < bays; i++) {
      const a0 = za + i * bw;
      arc(naveSec(a0 + bw / 2), () => archWall(ctx, a0, a0 + bw, x - 0.45, x + 0.45, 11, a0 + bw / 2, bw - 1.2, 7.6, { axis: 'z', mat: 'ashlar', slices: 8, vmat: 'ashlar' }));
    }
    // (algo más gruesos que el machón del arco que se apoya en ellos: con la
    // cara en el mismo plano parpadeaban)
    arc(0, () => solid(ctx, 'ashlar', x - 0.6, 0, za - 0.62, x + 0.6, 11, za + 0.62, { sub: 2 }));
    arc(3, () => solid(ctx, 'ashlar', x - 0.6, 0, zb - 0.62, x + 0.6, 11, zb + 0.62, { sub: 2 }));
    // los tramos de los extremos: un arco ancho sobre el presbiterio y, a
    // poniente, el muro hasta las torres
    arc(0, () => archWall(ctx, -104, za - 0.62, x - 0.45, x + 0.45, 11, -99.8, 5.6, 8.6, { axis: 'z', mat: 'ashlar', slices: 9, vmat: 'ashlar' }));
    arc(3, () => solid(ctx, 'ashlar', x - 0.45, 0, zb + 0.62, x + 0.45, 11, -64, { sub: 2, faces: 'ew' }));
    // el muro de encima de las arquerías, hasta el arranque de la bóveda
    inG(['naveRoof'], () => bySec(-104, -64, (a, b) => solid(ctx, 'ashlar', x - 0.45, 11, a, x + 0.45, YV, b, { sub: 2, faces: 'ew' })));
  }
  inG(['naveRoof'], () =>
    bySec(-104, -61.5, (a, b, k) => {
      barrelVault(ctx, { x0: -5.05, z0: a, x1: 5.05, z1: b, axis: 'z', ys: YV, rise: RV, mat: 'ashlar', tint: VT, room, sub: 1.6, impostTint: FT });
      ctx.col.add(-5.05, YV + RV, a, 5.05, YV + RV + 0.4, b).cam = true;
      // (sobre el muro de la cabecera, que llega a 14 m, el testero de la bóveda)
      if (k === 0) lunette(ctx, { axis: 'z', at: -104, c: 0, span: 10.1, ys: YV, rise: RV, face: 1, mat: 'ashlar', tint: VT, room, hole: { u0: -6, u1: 6, y: 14 } });
    })
  );
  // fajones, sobre ménsulas en el muro y, en los machones de las arquerías,
  // sobre columnas adosadas que bajan hasta el suelo (cada fajón en su grupo:
  // la bóveda se parte entre ellos y caen aparte)
  NAVE.faj.forEach((z, i) => {
    inG(['naveRoof', 'naveFaj:' + i], () => {
      archRing(ctx, { axis: 'x', c: 0, w: 9.9, y0: YV, rise: RV - 0.22, ring: 0.32, t0: z - 0.26, t1: z + 0.26, mat: 'ashlar', room, tint: FT, cam: false, n: 15 });
      for (const sx of [-1, 1]) {
        const xf = sx * 5.05;
        // (sin cara de arriba: ahí asientan la imposta y el fajón)
        wb.box('ashlar', Math.min(xf, xf - sx * 0.32), YV - 0.42, z - 0.3, Math.max(xf, xf - sx * 0.32), YV, z + 0.3, { ao: false, room, tint: FT, faces: sx < 0 ? 'nseb' : 'nswb' });
      }
    });
    if (z > za + 0.1 && z < zb - 0.1)
      for (const sx of [-1, 1]) {
        const xf = sx * 5.05,
          k = naveSec(z);
        // la columna, hasta lo alto de la arquería; por encima, con el muro
        arc(k, () => pilaster(ctx, xf, z, sx < 0 ? 'e' : 'w', FY, 11, { room, tint: FT, w: 0.42, d: 0.14 }));
        inG(['naveRoof', 'naveRoof:' + k], () => wb.box('ashlar', Math.min(xf, xf - sx * 0.14), 11, z - 0.21, Math.max(xf, xf - sx * 0.14), YV - 0.42, z + 0.21, { ao: false, room, tint: FT, faces: sx < 0 ? 'nse' : 'nsw' }));
      }
  });
  // las naves laterales: techo de tablas sobre vigas, a la altura del arranque
  inG(['naveRoof'], () => {
    for (const [xa, xb] of [
      [-11, -5.95],
      [5.95, 11],
    ]) {
      const xw = xa < 0 ? xa : xb - 0.3;
      bySec(-104, -64, (a, b) => {
        wb.box('planks', xa, YV, a, xb, YV + 0.1, b, { faces: 'b', ao: false, room, tint: [0.7, 0.6, 0.5], uv: 0.7, sub: 2 });
        ctx.col.add(xa, YV, a, xb, YV + 0.4, b).cam = true;
        wb.box('timber', xw, YV - 0.4, a, xw + 0.3, YV, b, { ao: false, room, faces: 'ewb', tint: [0.75, 0.66, 0.56] });
      });
      for (let z = -102.4; z < -64.5; z += bw / 2) inG(['naveRoof:' + naveSec(z)], () => wb.box('timber', xa, YV - 0.34, z - 0.14, xb, YV, z + 0.14, { ao: false, room, faces: 'nsewb', tint: [0.8, 0.7, 0.6] }));
    }
    // coronas de velas en la nave y lámparas en las laterales: la luz llega a
    // la bóveda y a los techos
    NAVE.crowns.forEach((z, i) => inG(['naveCrown:' + i], () => P.candleCrown(ctx, 0, 8.6, z, YV + RV - 0.1, { room, r: 1.3, n: 12, radius: 12, intensity: 1.15 })));
    for (const x of [-8.5, 8.5]) for (const z of [-70, -86, -100]) inG(['naveRoof:' + naveSec(z)], () => P.hangingLamp(ctx, x, YV - 0.34, z, { room, len: 2.4, radius: 8, intensity: 0.9 }));
  });
  // barandilla alrededor del hueco de la escalera de la cripta: sólo hasta la
  // boca de su bóveda; de ahí al presbiterio la escalera va bajo el suelo
  // (piezas que no se solapan y pilastras que sobresalen un poco: las caras
  // coincidentes de las esquinas parpadeaban)
  const CM = CRYPT_STAIR.mouth;
  solid(ctx, 'ashlar', -2.4, FY, CM - 0.4, -2, FY + 0.95, -86, { sub: 2 });
  solid(ctx, 'ashlar', 2, FY, CM - 0.4, 2.4, FY + 0.95, -86, { sub: 2 });
  solid(ctx, 'ashlar', -2, FY, CM - 0.4, 2, FY + 0.95, CM, { sub: 2 });
  // el suelo de la nave sobre la bóveda (a ras de los de los lados)
  wb.box('flag', -2, FY - 0.3, -97, 2, FY, CM, { faces: 't', ao: false, sub: 2.5, room, uv: 0.4 });
  ctx.col.add(-2, 0.2, -97, 2, FY, CM);
  for (const x of [-2.2, 2.2]) wb.box('ashlar', x - 0.26, FY, -86.5, x + 0.26, FY + 1.4, -85.98, { ao: false });
  // torno junto a la reja
  wb.box('wooddark', 2.9, FY, -85.6, 3.1, FY + 1.2, -85.4, { ao: false });
  wb.box('wooddark', 3.9, FY, -85.6, 4.1, FY + 1.2, -85.4, { ao: false });
  wb.push();
  wb.translate(3.5, FY + 1.0, -85.5);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('wooddark', 0, -0.5, 0, 0.18, 0.18, 1.0, 8, { ao: false, capTop: true, capBot: true });
  wb.pop();
  ctx.col.add(2.8, FY, -85.8, 4.2, FY + 1.3, -85.2);

  // bancos (algunos volcados) con fieles muertos arrodillados (los de más al
  // norte, en dos grupos: los revienta la mano del gigante)
  const rng = new RNG(1212);
  for (let z = -68; z >= -83; z -= 1.7) {
    const bi = NAVE.pews.findIndex(([a, b]) => z >= a && z <= b);
    if (bi >= 0) ctx.beginGroup('naveBancos:' + bi);
    for (const x of [-3.0, 3.0]) {
      const off = rng.chance(0.2) ? rng.range(-0.25, 0.25) : 0;
      P.pew(ctx, x, FY, z, 3.4, off);
      if (rng.chance(0.28)) bakeCorpse(wb, x + rng.range(-1, 1), FY + 0.02, z + 0.45, Math.PI, 'kneel', 'villager', rng.int(0, 5));
    }
    if (bi >= 0) ctx.endGroup();
  }
  P.pew(ctx, -8.4, FY, -74, 3, Math.PI / 2 + 0.3);
  P.pew(ctx, 8.4, FY, -90, 3, -Math.PI / 2 - 0.2);
  // presbiterio: altar, cruz invadida por la carne, candelabros (con la
  // cabecera: los pisa el gigante)
  inG(['cabecera'], () => {
    P.altarTable(ctx, 0, 1.2, -102.4, 0, 3);
    wb.box('wooddark', -0.18, 1.2, -103.8, 0.18, 8.2, -103.5, { ao: false });
    wb.box('wooddark', -2.2, 6.2, -103.8, 2.2, 6.6, -103.5, { ao: false });
    P.fleshGrowth(ctx, 0, 5.5, -103.4, 1.3, 1301, { room, climb: 1.2, lift: 2, bound: [-4, 4, -103.8, -102.8] });
    P.candles(ctx, -1, 2.22, -102.4, 5, 1302, { room, radius: 5, intensity: 1.2, spread: 0.3 });
    P.candles(ctx, 1, 2.22, -102.4, 5, 1303, { room, radius: 5, intensity: 1.2, spread: 0.3 });
    P.candelabra(ctx, -4.2, 1.2, -101.5, { room });
    P.candelabra(ctx, 4.2, 1.2, -101.5, { room });
    P.veiledStatue(ctx, -7.2, 1.2, -103, 0.4, { ped: 1.0 });
    P.veiledStatue(ctx, 7.2, 1.2, -103, -0.4, { ped: 1.0 });
  });
  P.candelabra(ctx, -8.8, FY, -66, { room });
  P.candelabra(ctx, 8.8, FY, -94, { room });
  P.veiledStatue(ctx, -10.3, FY, -84, Math.PI / 2, { ped: 1.0, veil: 'burlap' });
  P.veiledStatue(ctx, 10.3, FY, -70, -Math.PI / 2, { ped: 1.0 });
  P.candles(ctx, -9.4, FY, -92, 8, 1304, { room, radius: 5, intensity: 0.9, spread: 0.5 });
  P.candles(ctx, 9.5, FY, -76, 8, 1305, { room, radius: 5, intensity: 0.9, spread: 0.5 });
  P.candles(ctx, -3.2, FY, -87, 5, 1306, { room, radius: 4, intensity: 0.8, spread: 0.3 });
  // la corrupción brota de la cripta
  P.fleshGrowth(ctx, -2.8, FY, -92, 1.1, 1307, { room, climb: 1.4 });
  P.fleshGrowth(ctx, 2.9, FY, -95, 1.2, 1308, { room, climb: 1.4 });
  inG(['naveArc:0'], () => P.fleshGrowth(ctx, -5.5, FY + 0.4, -95, 1.0, 1309, { room, climb: 2.2, lift: 1.5 }));
  inG(['naveArc:1'], () => P.fleshGrowth(ctx, 5.5, FY + 0.4, -89, 0.9, 1310, { room, climb: 2.4, lift: 1.5 }));
  P.fleshGrowth(ctx, 0.5, FY, -84.6, 0.7, 1311, { room, climb: 0.2 });
  for (const [x, z, s] of [
    [0, -83, 3],
    [-3, -76, 2],
    [4, -71, 2.2],
    [-7, -90, 2.4],
  ])
    P.decal(ctx, x, FY + 0.02, z, s);
  bakeCorpse(wb, -8, FY, -80, 0.9, 'face', 'villager', 3);
  bakeCorpse(wb, 7.5, FY, -97, -2, 'back', 'soldier', 4);
  inG(['naveRoof', 'naveRoof:' + naveSec(-78.1)], () => {
    P.banner(ctx, -4.96, 12.1, -78.1, Math.PI / 2, 'bannerBlack', 1.4, 3.6);
    P.banner(ctx, 4.96, 12.1, -78.1, -Math.PI / 2, 'bannerBlack', 1.4, 3.6);
  });
  // el estandarte grande, colgado del fajón del presbiterio con dos cadenas
  // (aparte: en la película el jugador cae y se agarra a él)
  {
    const B = NAVE.banner;
    inG(['naveRoof', 'naveBanner'], () => P.banner(ctx, B.x, B.y, B.z, 0, 'bannerBlack', B.w, B.h));
    // (la barra y las cadenas, con el fajón del que cuelgan)
    inG(['naveRoof', 'naveFaj:0'], () => {
      wb.box('wooddark', -1.4, 12.38, -99.85, 1.4, 12.48, -99.75, { ao: false, room });
      for (const x of [-1.1, 1.1]) P.chains(ctx, x, 16.2, -99.8, Math.round((16.2 - 12.48) / 0.06));
    });
  }
  // --- las ruinas: ocultas hasta que se rompe la nave (el tejado, las
  // bóvedas y lo alto de los muros desaparecen y queda esto), por tramos
  ctx.beginGroup('naveRuin');
  {
    const rr = new RNG(4141);
    const RT = [0.78, 0.74, 0.7];
    // lo alto de un muro, roto en dientes (de y0 hacia arriba, hasta hMax)
    const jag = (x0, z0, x1, z1, axis, y0 = CUT, hMax = 2.3) => {
      const L = axis === 'z' ? z1 - z0 : x1 - x0;
      let a = 0;
      while (a < L - 0.01) {
        const w = Math.min(L - a, rr.range(0.7, 2.2));
        const h = rr.range(0.2, hMax) * (rr.chance(0.2) ? 0.3 : 1);
        if (axis === 'z') wb.box('ashlar', x0, y0, z0 + a, x1, y0 + h, z0 + a + w, { ao: false, sub: 1.5, tint: RT });
        else wb.box('ashlar', x0 + a, y0, z0, x0 + a + w, y0 + h, z1, { ao: false, sub: 1.5, tint: RT });
        a += w;
      }
    };
    bySec(-104, -64, (a, b) => jag(-13, a, -11, b, 'z'), 'naveRuin');
    bySec(-104, -81, (a, b) => jag(11, a, 13, b, 'z'), 'naveRuin');
    bySec(-79, -64, (a, b) => jag(11, a, 13, b, 'z'), 'naveRuin');
    inG(['naveRuin:' + naveSec(-80)], () => jag(11, -81, 13, -79, 'z'));
    // lo alto de las arquerías, mientras sigan en pie
    for (const x of [-5.5, 5.5]) bySec(-104, -64, (a, b, k) => inG(['naveArc:' + k], () => jag(x - 0.45, a, x + 0.45, b, 'z', 11, 1.2)), 'naveRuin');
    // montones de escombros (sin tapar el pasillo hasta la reja de la cripta)
    for (const [x, z, n, sp, seed] of [
      [-8, -70, 14, 2.6, 4201],
      [8.2, -75, 12, 2.4, 4202],
      [-8.5, -94, 14, 2.8, 4203],
      [7.5, -99, 10, 2.2, 4204],
      [-5.2, -80, 8, 1.4, 4205],
      [5.2, -67, 9, 1.6, 4206],
      [8.6, -88, 10, 2, 4207],
    ])
      inG(['naveRuin:' + naveSec(z)], () => P.rubble(ctx, x, FY, z, n, seed, sp, { scale: 1.6, mat: 'ashlar', collide: true, h: 1.0, room }));
    // trozos de la bóveda caídos sobre los bancos
    for (const [x, z, ry, rx, w, d] of [
      [-4.2, -73, 0.4, 0.25, 3.0, 2.2],
      [7.4, -91.5, -0.6, -0.3, 2.6, 2.0],
      [-6.5, -100.5, 1.1, 0.2, 2.4, 1.8],
      [6.6, -82, 0.2, -0.22, 2.6, 1.6],
    ])
      inG(['naveRuin:' + naveSec(z)], () => {
        wb.push();
        wb.translate(x, FY + 0.45, z);
        wb.rotateY(ry);
        wb.rotateX(rx);
        wb.box('ashlar', -w / 2, -0.35, -d / 2, w / 2, 0.35, d / 2, { ao: false, sub: 1.2, tint: [0.86, 0.83, 0.78], room });
        wb.pop();
        ctx.col.add(x - w * 0.42, FY, z - d * 0.42, x + w * 0.42, FY + 1.0, z + d * 0.42);
      });
    // vigas del tejado caídas
    inG(['naveRuin:' + naveSec(-68)], () => P.beam(ctx, -9.5, -66, -3, -71, FY + 0.15, 0.16));
    inG(['naveRuin:' + naveSec(-97)], () => P.beam(ctx, 9.6, -94, 3.5, -99.5, FY + 0.15, 0.15));
    inG(['naveRuin:' + naveSec(-81)], () => P.beam(ctx, -10, -84, -5.6, -78, FY + 0.15, 0.14));
  }
  ctx.endGroup();
  naveBreaks(ctx, { room, FY, CUT });
  // candelabros volcados y cera por el suelo de la nave
  P.candles(ctx, 8.6, FY, -70.5, 5, 1312, { room, unlit: true, spread: 0.5 });
  P.candles(ctx, -8.9, FY, -96.8, 4, 1313, { room, unlit: true, spread: 0.4 });
  P.chains(ctx, -10.9, 5.2, -88, 12, 0);
  P.chains(ctx, 10.9, 5.6, -74, 10, 0);
  wb.setRoom(null);
  ctx.rats.push({ x: -10.0, y: FY, z: -102.6, n: 2 });

  L.interact.push(
    // (de medio punto: de 2,4 m en las jambas a 4 en la clave, como el arco)
    { kind: 'door', id: 'd_se', x: 0, y: FY, z: -60.75, w: 3.2, h: 4.0, arch: true, axis: 'x', lock: { type: 'barred', side: -1 }, mat: 'planks', hinge: 0, swing: -1, double: true, plane: -60.05 },
    { kind: 'door', id: 'd_claustro_se', x: 12, y: FY, z: -80, w: 2, h: 2.55, axis: 'z', lock: { type: 'none' }, mat: 'planks', hinge: -1, swing: -1, plane: 11.05 },
    // (la reja de la cripta: el torno la baja por su ranura y se mete entera
    // en el peldaño de arriba; subiendo, se quedaba colgada en el aire de la
    // nave, sin nada de lo que colgar)
    { kind: 'door', id: 'd_cripta', x: 0, y: FY, z: -86.1, w: 4, h: 3.2, sink: true, axis: 'x', lock: { type: 'grate', item: 'manivela' }, mat: 'grate', ix: 3.5, iz: -84.9 }
  );
  // escalón de la puerta lateral y umbral a la altura de la nave bajo la hoja
  // (abre hacia dentro: con la hoja a ras del escalón rozaba el suelo de la nave)
  W(S, 11, -81, 13.2, -79);
  wb.box('ashlar', 11.6, 0, -81, 13, 0.3, -79, { faces: 'tnsew', ao: false });
  ctx.col.add(11.6, 0, -81, 13, 0.3, -79);
  wb.box('ashlar', 11, 0, -81, 11.6, FY, -79, { faces: 'te', ao: false });
  ctx.col.add(11, 0, -81, 11.6, FY, -79);

  L.enemies.push(
    { type: 'bell', x: 0, y: FY, z: -74, yaw: Math.PI, idle: 'wander', id: 'e_se1' },
    { type: 'penitent', x: -3.0, y: FY, z: -70.55, yaw: Math.PI, idle: 'pray', id: 'e_se2' },
    { type: 'penitent', x: 3.0, y: FY, z: -79.05, yaw: Math.PI, idle: 'pray', id: 'e_se3' },
    { type: 'mourner', x: 0, y: 1.2, z: -99.5, yaw: 0, idle: 'stand', id: 'e_se4' }
  );
  L.phantoms.push({ x: 0, y: 1.2, z: -101, trigger: [0, 0.6, -70], kind: 'penitent' });
  L.zones.push({ id: 'cathedral', rects: [[-13, -108, 13, -61.5, -0.5, 16]], atmo: 'cathedral', room: 'cathedral' });
  L.map.push({ id: 'cathedral', r: [-11, -104, 11, -61.5] }, { id: 'largo', r: [-5, -61.5, 5, -55] });
}

// ======================================================================== CLAUSTRO
export function buildCloister(ctx, S, L) {
  const wb = ctx.wb;
  W(S, 13, -88, 36, -60.5);
  W(S, 15.5, -60.6, 19, -56);
  // muros exteriores
  // (1 cm por dentro de las tapias de la plaza que los flanquean: con las
  // caras coincidentes, las jambas de la verja parpadeaban)
  solid(ctx, 'wallstone', 13, 0, -60.5, 15.49, 7, -59.5, { sub: 2 });
  solid(ctx, 'wallstone', 19.01, 0, -60.5, 37, 7, -59.5, { sub: 2 });
  solid(ctx, 'wallstone', 15.49, 3.6, -60.5, 19.01, 7, -59.5, { sub: 2, ao: false, faces: 'tnsewb' });
  solid(ctx, 'wallstone', 36, 0, -89, 37, 7, -60.5, { sub: 2 });
  solid(ctx, 'wallstone', 13, 0, -89, 37, 7, -88, { sub: 2 });
  floor(ctx, 13, -88, 36, -60.5, 'flag');
  floor(ctx, 19.4, -81.6, 29.6, -66.4, 'dirt', 0.02);
  // paso de la verja hacia el atrio de la catedral
  floor(ctx, 15.5, -60.6, 19, -55.9, 'flag', 0.015);
  // parapeto del patio con huecos centrales + columnas
  const gx0 = 19,
    gx1 = 30,
    gz0 = -82,
    gz1 = -66;
  const par = (x0, z0, x1, z1) => solid(ctx, 'ashlar', x0, 0, z0, x1, 0.9, z1, { sub: 2 });
  par(gx0, gz0, 23.5, gz0 + 0.4);
  par(25.5, gz0, gx1, gz0 + 0.4);
  par(gx0, gz1 - 0.4, 23.5, gz1);
  par(25.5, gz1 - 0.4, gx1, gz1);
  // (los tramos laterales empiezan donde acaban los de las esquinas: solapados,
  // sus caras coincidentes parpadeaban)
  par(gx0, gz0 + 0.4, gx0 + 0.4, -75);
  par(gx0, -73, gx0 + 0.4, gz1 - 0.4);
  par(gx1 - 0.4, gz0 + 0.4, gx1, -75);
  par(gx1 - 0.4, -73, gx1, gz1 - 0.4);
  for (let x = gx0; x <= gx1 + 0.01; x += 2.2) {
    for (const z of [gz0 + 0.2, gz1 - 0.2]) {
      if (Math.abs(x - 24.5) < 1.2) continue;
      wb.cylinder('ashlar', x, 0.9, z, 0.17, 0.15, 3.3, 6, { ao: false });
      wb.box('ashlar', x - 0.28, 4.1, z - 0.28, x + 0.28, 4.4, z + 0.28, { ao: false, faces: 'tnsewb' });
    }
  }
  for (let z = gz0; z <= gz1 + 0.01; z += 2.0) {
    for (const x of [gx0 + 0.2, gx1 - 0.2]) {
      if (Math.abs(z + 74) < 1.2) continue;
      wb.cylinder('ashlar', x, 0.9, z, 0.17, 0.15, 3.3, 6, { ao: false });
      wb.box('ashlar', x - 0.28, 4.1, z - 0.28, x + 0.28, 4.4, z + 0.28, { ao: false, faces: 'tnsewb' });
    }
  }
  // vigas y tejados en pendiente de las galerías
  wb.box('ashlar', gx0, 4.4, gz0 - 0.1, gx1, 4.8, gz0 + 0.5, { ao: false, faces: 'tnsewb' });
  wb.box('ashlar', gx0, 4.4, gz1 - 0.5, gx1, 4.8, gz1 + 0.1, { ao: false, faces: 'tnsewb' });
  wb.box('ashlar', gx0 - 0.1, 4.4, gz0 + 0.5, gx0 + 0.5, 4.8, gz1 - 0.5, { ao: false, faces: 'tnsewb' });
  wb.box('ashlar', gx1 - 0.5, 4.4, gz0 + 0.5, gx1 + 0.1, 4.8, gz1 - 0.5, { ao: false, faces: 'tnsewb' });
  // el tejado de las galerías: un anillo de faldones que bajan hacia el
  // patio, con su grueso, el canto del alero, limas en las esquinas y los
  // pares por debajo (antes, cuatro planos sueltos que se cruzaban en las
  // esquinas: por los cantos y los rincones se veía el vacío)
  {
    const OR = [13, -88, 36, -60.5], // por fuera (contra los muros)
      IR = [gx0 - 0.2, gz0 - 0.2, gx1 + 0.2, gz1 + 0.2]; // el alero
    const yo = 6.6,
      yi = 4.8,
      th = 0.22;
    const ro = { ao: false, sub: 2.4 },
      uo = { ao: false, sub: 3, tint: [0.62, 0.55, 0.48] },
      eo = { ao: false, sub: 3, tint: [0.55, 0.48, 0.42] };
    // esquinas, de fuera a dentro: [x, z]
    const oc = [
      [OR[0], OR[1]],
      [OR[2], OR[1]],
      [OR[2], OR[3]],
      [OR[0], OR[3]],
    ];
    const ic = [
      [IR[0], IR[1]],
      [IR[2], IR[1]],
      [IR[2], IR[3]],
      [IR[0], IR[3]],
    ];
    for (let k = 0; k < 4; k++) {
      const [ax, az] = oc[k],
        [bx, bz] = oc[(k + 1) % 4],
        [cx, cz] = ic[(k + 1) % 4],
        [dx, dz] = ic[k];
      // faldón: visto desde arriba (hacia dentro y abajo), y su cara de abajo
      wb.quad('roof', V(dx, yi, dz), V(cx, yi, cz), V(bx, yo, bz), V(ax, yo, az), ro);
      wb.quad('planks', V(ax, yo - th, az), V(bx, yo - th, bz), V(cx, yi - th, cz), V(dx, yi - th, dz), uo);
      // canto del alero
      wb.quad('wooddark', V(dx, yi - th, dz), V(cx, yi - th, cz), V(cx, yi, cz), V(dx, yi, dz), eo);
      // la lima (del rincón de dentro a la esquina de fuera), con su teja
      beam(ctx, 'roof', V(dx, yi + 0.06, dz), V(ax, yo + 0.06, az), 0.3, { d: 0.14, side: V(az - dz, 0, dx - ax).normalize() });
      // pares: de la viga del claustro al muro, cada metro y pico
      const along = Math.hypot(cx - dx, cz - dz);
      const n = Math.max(2, Math.round(along / 1.15));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const pi = V(dx + (cx - dx) * t, yi - th - 0.09, dz + (cz - dz) * t);
        const po = V(ax + (bx - ax) * t, yo - th - 0.09, az + (bz - az) * t);
        beam(ctx, 'timber', pi, po, 0.16, { d: 0.18, tint: [0.7, 0.6, 0.5], side: V(cx - dx, 0, cz - dz).normalize() });
      }
    }
    // la cámara no se mete en el tejado (escalonado a lo hondo de cada galería)
    for (let k = 0; k < 3; k++) {
      const f0 = k / 3,
        f1 = (k + 1) / 3;
      const y0 = yi - th + (yo - yi) * f0;
      const lerp = (a, b, f) => a + (b - a) * f;
      const r0 = [lerp(IR[0], OR[0], f1), lerp(IR[1], OR[1], f1), lerp(IR[2], OR[2], f1), lerp(IR[3], OR[3], f1)];
      const r1 = [lerp(IR[0], OR[0], f0), lerp(IR[1], OR[1], f0), lerp(IR[2], OR[2], f0), lerp(IR[3], OR[3], f0)];
      // (el anillo entre r0 —más fuera— y r1, a esa altura)
      ctx.col.addCam(r0[0], y0, r0[1], r0[2], y0 + 0.9, r1[1]);
      ctx.col.addCam(r0[0], y0, r1[3], r0[2], y0 + 0.9, r0[3]);
      ctx.col.addCam(r0[0], y0, r1[1], r1[0], y0 + 0.9, r1[3]);
      ctx.col.addCam(r1[2], y0, r1[1], r0[2], y0 + 0.9, r1[3]);
    }
    // faroles bajo las galerías (colgados de la cara de abajo del faldón, a
    // media hondura de cada galería)
    for (const [x, z] of [
      [20.5, -63.2],
      [28.5, -85.0],
      [16.0, -77.0],
      [33.0, -70.0],
    ])
      P.hangingLamp(ctx, x, yi - th + (yo - yi) * 0.48, z, { len: 0.6, radius: 7, intensity: 0.9 });
  }
  // patio: árbol muerto y tumbas (algunas abiertas desde dentro)
  P.deadTree(ctx, 24.5, 0, -74, 1401, 7);
  const graves = [
    [21, -69.5, 0, 0],
    [21, -78.5, 0, 1],
    [27.7, -69.5, 0, 0],
    [27.7, -78.5, 0, 1],
    [21, -74, Math.PI / 2, 0],
    [28, -74.5, -Math.PI / 2, 1],
  ];
  graves.forEach(([x, z, r, k]) => P.grave(ctx, x, 0, z, r, k));
  P.rubble(ctx, 27.9, 0, -69, 5, 1402, 0.8, { mat: 'dirt', scale: 1.2 });
  wb.box('black', 27.3, 0.01, -69.2, 28.4, 0.03, -67.6, { faces: 't', ao: false, grime: false });
  P.bones(ctx, 27.8, 0.03, -68.4, 5, 1403, 0.4);
  P.rubble(ctx, 21.2, 0, -77.6, 5, 1404, 0.8, { mat: 'dirt', scale: 1.2 });
  // galerías
  P.bench(ctx, 33.5, 0, -75, 2, Math.PI / 2);
  P.bench(ctx, 15.5, 0, -70, 2, Math.PI / 2);
  P.veiledStatue(ctx, 35.3, 0, -61.4, -0.7, { ped: 0.8 });
  P.veiledStatue(ctx, 35.3, 0, -87.2, -2.4, { ped: 0.8 });
  P.candles(ctx, 34.6, 0, -86.4, 7, 1405, { radius: 4.5, intensity: 0.9 });
  P.candles(ctx, 14.2, 0, -61.6, 6, 1406, { radius: 4, intensity: 0.8 });
  P.wallTorch(ctx, 36, 3, -74, 'w');
  P.wallTorch(ctx, 24.5, 3, -88, 's');
  bakeCorpse(wb, 33, 0, -64, 2.4, 'kneel', 'villager', 3);
  bakeCorpse(wb, 16, 0, -84.5, 0.4, 'back', 'villager', 2);
  P.decal(ctx, 16, 0.02, -84.5, 2);
  P.fleshGrowth(ctx, 13.4, 0, -79.6, 0.7, 1407, { climb: 1.4 });
  P.jar(ctx, 34.9, 0, -62.6, 1.1);
  P.jar(ctx, 35.2, 0, -63.5, 0.8, { broken: true });
  P.basket(ctx, 14.3, 0, -73.6, { tipped: true, rot: -1.2, fill: 'straw', fillTint: [0.5, 0.35, 0.2] });
  ctx.crows.push({ x: 24.5, y: 0, z: -70.2, r: 1.4, n: 4 });
  ctx.rats.push({ x: 14.4, y: 0, z: -87.2, n: 2 });
  L.interact.push(
    { kind: 'door', id: 'd_claustro', x: 17.25, y: 0, z: -60, w: 3.5, h: 3.55, axis: 'x', lock: { type: 'key', item: 'llave_claustro' }, mat: 'irongate', hinge: 0, swing: 1, double: true, plane: -60.55 },
    { kind: 'item', id: 'i_relicario1', item: 'relicario', x: 27.9, y: 0.25, z: -68.3 },
    { kind: 'note', id: 'n_claustro', note: 'claustro', x: 21, y: 0.9, z: -78.4, model: 'stone', r: 1.6 }
  );
  L.enemies.push(
    { type: 'penitent', x: 21, y: 0, z: -71, yaw: 0, idle: 'kneel', id: 'e_cl1' },
    { type: 'penitent', x: 27.6, y: 0, z: -80, yaw: 0, idle: 'kneel', id: 'e_cl2' },
    { type: 'hound', x: 33, y: 0, z: -79, yaw: 1.5, idle: 'eat', id: 'e_cl3' },
    { type: 'crawler', x: 26, y: 0, z: -85.5, yaw: 0, idle: 'stand', id: 'e_cl4' }
  );
  L.phantoms.push({ x: 24.5, y: 0, z: -84.5, trigger: [17, 0, -64], kind: 'mourner' });
  L.zones.push({ id: 'cloister', rects: [[13, -88, 36, -60.5, -1, 8], [15.5, -60.6, 19, -59.4, -1, 8]], atmo: 'city' });
  L.map.push({ id: 'cloister', r: [13, -88, 36, -60.5] });
}

// ======================================================================== CRIPTA
// La escalera de la cripta, que comparte la catedral: baja hacia el norte
// desde la reja de la nave; sólo su primer tramo queda bajo el hueco del suelo
// (con su balaustrada): desde la boca sigue por debajo de la nave, bajo una
// bóveda en rampa. spr: arranque de la bóveda sobre la línea de los peldaños.
export const CRYPT_STAIR = { zTop: -86, zBot: -97, n: 25, rise: 0.304, run: 0.44, spr: 2.0, mouth: -92.5 };

// Dos bocas de la cripta hacia la honda (lo de detrás lo levanta
// level_crypt2.js). En el muro oeste de la sala de llegada, el paso escondido
// de las catacumbas: un lienzo del mismo muro, a ras, que se hunde en el
// suelo cuando se echa su palanca desde la escalera (aquí, sólo su hueco). Y
// en el muro este del sepulcro, la puerta del paso del arzobispo. (Sus cantos,
// en la rejilla de medio metro con la que se levantan los muros de la cripta
// honda: con la boca a -121,25 el arco, la bóveda y los peldaños quedaban un
// cuarto de metro corridos respecto del hueco.)
// El Templo de Bracara (la basílica romana de tres naves, al oeste del
// osario): su planta de muro a muro, la luz de la nave del medio (entre las
// caras de sus arquerías), el grueso de sus pilares, sus tramos, el arranque
// de las bóvedas sobre el suelo y la flecha de la del medio, y la puerta del
// oeste (la del paso del panteón, en el eje de su corredor; ver panteon.js).
export const TEMPLO = { x0: -19, x1: -3.5, z0: -132, z1: -112, nave: 5.9, pier: 0.8, bay: 5, ys: 4.3, rise: 1.3, west: { z: -118.5, w: 2 } };

export const CRYPT_DOORS = {
  llegada: { x0: -7.5, x1: -7, z0: -103, z1: -100.5, h: 2.2 },
  paso: { z: -120, w: 2, h: 2.2, rise: 1.0 },
};

// La cripta, abovedada de punta a punta. Antes eran cajas con un techo plano
// de una sola cara al que no llegaba la luz (se veía negro, como el vacío),
// la escalera era un pozo abierto hasta el techo de la nave, entre muros de
// una cara, y la galería del río tenía un techo escalonado con rendijas.
export function buildCrypt(ctx, S, C, L) {
  const wb = ctx.wb;
  const Y = -7;
  const room = 'crypt';
  const CT = [0.74, 0.74, 0.7], // muros
    VT = [0.68, 0.68, 0.65], // bóvedas
    AT = [0.88, 0.85, 0.79]; // arcos, pilastras y columnas
  wb.setRoom(room);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const cryptFloor = (x0, z0, x1, z1, y, mat = 'flag', tint) => {
    wb.box(mat, x0, y - 0.3, z0, x1, y, z1, { faces: 't', ao: false, sub: 2.5, room, uv: mat === 'mosaic' ? 0.2 : 0.5, tint });
    ctx.col.add(x0, y - 1, z0, x1, y, z1);
  };
  // cara de un muro que mira hacia 'f' (n: -z, s: +z, e: +x, w: -x)
  const wallFace = (mat, x0, y0, z0, x1, y1, z1, f, o = {}) =>
    wb.box(mat, x0, y0, z0, x1, y1, z1, { faces: f, sub: 1.6, aoH: 1.4, aoMin: 0.5, baseY: o.baseY ?? y0, room: o.room ?? room, tint: o.tint ?? CT });
  // muro de una cara con el canto de arriba inclinado (al lado de una
  // escalera): en el plano x, de zA a zB (zA < zB), de yB a yA..yb
  const slopeWall = (mat, x, f, zA, zB, yB, yA, yb, o = {}) => {
    const opt = { sub: 1.6, ao: false, room: o.room ?? room, tint: o.tint ?? CT };
    if (f > 0) wb.quad(mat, V3(x, yB, zA), V3(x, yA, zA), V3(x, yb, zB), V3(x, yB, zB), opt);
    else wb.quad(mat, V3(x, yB, zA), V3(x, yB, zB), V3(x, yb, zB), V3(x, yA, zA), opt);
  };
  // techo para la cámara y para lo que se cuelga de él (en la clave)
  const ceilCol = (x0, z0, x1, z1, y) => (ctx.col.add(x0, y, z0, x1, y + 0.4, z1).cam = true);
  // boca de paso entre dos salas (en un muro de 'x' en 'z'... en el eje que
  // toque): el arco de medio punto rebajado con su rosca en el grueso del muro
  const SIDE_PORTAL = { w: 2, h: 1.6, rise: 0.9, ring: 0.28 };

  // --- la escalera desde la catedral
  const CS = CRYPT_STAIR;
  const slope = CS.rise / CS.run;
  const yAt = (z) => Y + (z - CS.zBot) * slope; // la línea de los peldaños
  const M = CS.mouth;
  const zw = CS.zBot + 0.5; // tras el grueso del muro de la sala de llegada
  W(S, -2, CS.zBot, 2, CS.zTop);
  C.paint(-2, CS.zBot - 0.2, 2, CS.zTop + 0.2, 1);
  stairs(ctx, 0, Y, CS.zBot, 's', 4, CS.n, CS.rise, CS.run, 'wallstone', { solidBelow: true });
  ctx.col.add(-2.6, Y, -97.2, -2, 0.6, -86);
  ctx.col.add(2, Y, -97.2, 2.6, 0.6, -86);
  // muros: bajo la bóveda llegan a su arranque (en rampa); en el tramo
  // abierto, hasta el suelo de la nave, donde se apoya la balaustrada
  slopeWall('wallstone', -2, 1, zw, M, Y - 0.5, yAt(zw) + CS.spr, yAt(M) + CS.spr);
  slopeWall('wallstone', 2, -1, zw, M, Y - 0.5, yAt(zw) + CS.spr, yAt(M) + CS.spr);
  wallFace('wallstone', -2.4, Y - 0.5, M, -2, 0.6, CS.zTop, 'e');
  wallFace('wallstone', 2, Y - 0.5, M, 2.4, 0.6, CS.zTop, 'w');
  rampVault(ctx, { x0: -2, x1: 2, z0: zw, z1: M, ys0: yAt(zw) + CS.spr, ys1: yAt(M) + CS.spr, mat: 'wallstone', tint: VT, room, impostTint: AT });
  // la boca, bajo el suelo de la nave: un arco con su muro hasta el suelo
  archRing(ctx, { axis: 'x', c: 0, w: 4, y0: yAt(M) + CS.spr, rise: 2, ring: 0.32, t0: M, t1: M + 0.3, top: 0.6, clip: [-2.4, 2.4], mat: 'ashlar', spMat: 'wallstone', room, tint: AT, spTint: CT });
  P.wallTorch(ctx, -2, yAt(-95.2) + 1.5, -95.2, 'e', { room, radius: 7 });
  P.wallTorch(ctx, 2, yAt(-89.6) + 1.5, -89.6, 'w', { room, radius: 7 });

  // --- la sala de llegada: tres naves sobre cuatro columnas, con arcos y
  // bóvedas de cañón; los sepulcros en la de poniente, el altar en la de
  // levante; lámparas colgadas y antorchas, que alumbran las bóvedas
  {
    const x0 = -7,
      x1 = 7,
      z0 = -110,
      z1 = -97;
    const YS = Y + 4.4, // arranque de las bóvedas
      YC = Y + 2.9; // capiteles
    C.paint(x0, z0, x1, z1, 1);
    cryptFloor(x0, z0, x1, z1, Y);
    // el muro del sur, con el arco de la escalera; el del norte, con el del
    // osario (de su misma bóveda); los de los lados, lisos
    archedWall(ctx, { axis: 'x', a0: x0, a1: x1, t0: z1, t1: z1 + 0.5, y0: Y, y1: YS, openings: [{ c: 0, w: 4, h: CS.spr, rise: 2, ring: 0.32, tint: AT }], rooms: [room, room], mat: 'mossstone', tint: CT, collide: false });
    archedWall(ctx, { axis: 'x', a0: x0, a1: x1, t0: z0 - 0.5, t1: z0, y0: Y, y1: YS, openings: [{ c: 0, w: 5, h: 2.5, rise: 1.3, ring: 0.32, tint: AT }], rooms: [room, room], mat: 'mossstone', tint: CT, collide: false });
    // (al oeste, el paso escondido de las catacumbas: el muro, con su hueco
    // a la medida y el dintel encima; el lienzo que lo tapa lo pone
    // level_crypt2.js, con la misma piedra, la misma oclusión y la misma
    // subdivisión que el muro: con todo el muro partido igual, no se nota)
    const HD = CRYPT_DOORS.llegada;
    const westWall = (a0, a1, y0, o = {}) => archedWall(ctx, { axis: 'z', a0, a1, t0: x0 - 0.5, t1: x0, y0, y1: YS, baseY: Y, sub: 0.55, rooms: [room, room], mat: 'mossstone', tint: CT, collide: false, ...o });
    westWall(z0, HD.z0, Y, { endHi: true });
    westWall(HD.z1, z1, Y, { endLo: true });
    westWall(HD.z0, HD.z1, Y + HD.h);
    wb.box('mossstone', x0 - 0.5, Y + HD.h - 0.01, HD.z0, x0, Y + HD.h, HD.z1, { faces: 'b', ao: false, room, tint: CT });
    wallFace('mossstone', x1, Y, z0, x1 + 0.5, YS, z1, 'w');
    for (const x of [-4, 4]) {
      for (const z of [-100, -107]) P.column(ctx, x, Y, z, YC - Y, 0.4, { mat: 'ashlar' });
      // arcos a lo largo, del muro a la columna, entre columnas y al otro muro
      const ar = (c, w, rise, clip) => archRing(ctx, { axis: 'z', c, w, y0: YC, rise, ring: 0.3, t0: x - 0.25, t1: x + 0.25, top: YS, clip, mat: 'ashlar', spMat: 'mossstone', room, tint: AT, spTint: CT });
      ar(-98.2, 2.4, 1.2, [-99.7, z1]);
      ar(-103.5, 5.8, 1.5);
      ar(-108.8, 2.4, 1.2, [z0, -107.3]);
      // el macizo sobre cada capitel, entre arco y arco
      for (const [za, zb] of [
        [-100.3, -99.7],
        [-107.3, -106.7],
      ])
        wb.box('mossstone', x - 0.25, YC, za, x + 0.25, YS, zb, { faces: 'ew', sub: 1.6, room, tint: CT });
      // y las pilastras de los muros, donde arrancan los de los extremos
      pilaster(ctx, z1, x, 'n', Y, YC, { room, tint: AT, w: 0.5 });
      pilaster(ctx, z0, x, 's', Y, YC, { room, tint: AT, w: 0.5 });
    }
    // las tres bóvedas, con sus lunetos en los testeros
    for (const [a, b] of [
      [x0, -4.25],
      [-3.75, 3.75],
      [4.25, x1],
    ]) {
      const span = b - a,
        c = (a + b) / 2;
      const rise = Math.min(1.35, span / 2 - 0.03);
      barrelVault(ctx, { x0: a, z0, x1: b, z1, axis: 'z', ys: YS, rise, mat: 'mossstone', tint: VT, room, sub: 1.0, impostTint: AT });
      lunette(ctx, { axis: 'z', at: z1, c, span, ys: YS, rise, face: -1, mat: 'mossstone', tint: CT, room });
      lunette(ctx, { axis: 'z', at: z0, c, span, ys: YS, rise, face: 1, mat: 'mossstone', tint: CT, room });
    }
    ceilCol(x0, z0, x1, z1, YS + 1.35);
    P.sarcophagus(ctx, -5.6, Y, -98.6, Math.PI / 2, { effigy: true, room });
    P.sarcophagus(ctx, -5.6, Y, -106, Math.PI / 2, { open: true, room });
    P.candleAltar(ctx, 5.8, Y, -103.5, -Math.PI / 2, room);
    P.candles(ctx, -6.3, Y, -103.9, 6, 1501, { room, radius: 4, intensity: 0.9, spread: 0.25 });
    P.candles(ctx, 6.2, Y, -109, 6, 1502, { room, radius: 4, intensity: 0.9 });
    P.bones(ctx, -5.8, Y, -108.8, 8, 1503, 0.6);
    ctx.rats.push({ x: -5.4, y: Y, z: -109.2, n: 2 });
    for (const z of [-100.6, -106.4]) P.hangingLamp(ctx, 0, YS + 1.35, z, { room, len: 1.7, radius: 8.5, intensity: 1.0 });
    P.wallTorch(ctx, x0, Y + 2.7, -107.6, 'e', { room, radius: 7 });
    P.wallTorch(ctx, x1, Y + 2.7, -99.4, 'w', { room, radius: 7 });
    P.wallTorch(ctx, x1, Y + 2.7, -107.6, 'w', { room, radius: 7 });
    if (ctx.shafts) ctx.shafts.push({ a: [0, Y + 3.8, -97.3], b: [0.4, Y, -100.8], w: 2.0, color: 0xffb070 });
    L.interact.push({ kind: 'altar', id: 'a_cripta', name: 'Altar de la Cripta', x: 5.8, y: Y, z: -103.5, spawn: [4.2, Y, -103.5], yaw: -Math.PI / 2 });
  }

  // --- el osario de las ánimas: el de los canónigos de la catedral. Los
  // muros, un columbario de calaveras en sus nichos chicos; en los nichos
  // grandes, cada canónigo con su óbolo en la boca y su lápida debajo (tres
  // sin nombre, y sin lamparilla: los olvidados); bajo la bóveda encalada,
  // fajones sobre pilastras. Al fondo del muro de poniente, el retablo de
  // las ánimas con su cepillo (el puzle: game/ossuaries.js). Las dos bocas
  // de los lados dan al sepulcro y al templo.
  // (al fondo, la boca de la Galería del Sello: ver level_crypt2.js)
  const OS = { x0: -2.5, x1: 2.5, z0: -133, z1: -110.5, YS: Y + 2.5, RISE: 1.3 };
  {
    const { x0, x1, z0, z1, YS, RISE } = OS;
    const ST = [0.8, 0.77, 0.72];
    const rng = new RNG(1580);
    C.paint(-2.5, -133, 2.5, -110, 1);
    cryptFloor(-2.5, -133, 2.5, -110, Y);
    const NZ = [-113, -117, -125, -129];
    const PZ = -120;
    const RZ = -129; // el retablo, en el muro de poniente
    const sp = SIDE_PORTAL;
    // los nichos de los canónigos: lápida (fila del atlas) y si se le nombra
    const LAP = { '-1:-113': 0, '-1:-117': 5, '-1:-125': 1, '1:-113': 4, '1:-117': 2, '1:-125': 3, '1:-129': 6 };
    const niches = [];
    const M = (x, y, z, ry) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1));
    const bake = (parts, m) => bakeParts(wb, parts, m, { room });
    // (el retablo: dónde quedó, para el cepillo, el cuaderno y el arca)
    let R = null;
    const plaque = (row, x, y, z, ry) => {
      const geo = new THREE.PlaneGeometry(0.9, 0.16);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, (7 - row + uv.getY(i)) / 8);
      wb.geometry('lapidasAnimas', geo, M(x, y, z, ry), { ao: false, room, grime: false });
    };
    for (const side of [-1, 1]) {
      const xf = side < 0 ? x0 : x1; // la cara del muro
      const xo = xf + side * 0.5; // el trasdós (pegado al muro de la sala de al lado)
      const xa = Math.min(xf, xo),
        xb = Math.max(xf, xo);
      const f = side < 0 ? 'e' : 'w';
      const ry = side < 0 ? Math.PI / 2 : -Math.PI / 2; // mirando al pasillo
      const seg = (za, zb, ya, yb, extra = '') => {
        if (zb - za < 0.001 || yb - ya < 0.001) return;
        wb.box('skullNiches', xa, ya, za, xb, yb, zb, { faces: f + extra, sub: 1.6, aoH: 1.2, aoMin: 0.55, baseY: Y, room, tint: ST });
      };
      const retablo = side < 0;
      const holes = [
        ...NZ.filter((z) => !(retablo && z === RZ)).map((z) => ({ a0: z - 0.6, a1: z + 0.6, niche: true })),
        ...(retablo ? [{ a0: RZ - 0.8, a1: RZ + 0.8, retablo: true }] : []),
        { a0: PZ - sp.w / 2 - sp.ring, a1: PZ + sp.w / 2 + sp.ring },
      ].sort((p, q) => p.a0 - q.a0);
      let cur = z0;
      for (const h of holes) {
        seg(cur, h.a0, Y, YS);
        const zc = (h.a0 + h.a1) / 2;
        const NT = [0.5, 0.48, 0.45];
        const xk = xo - side * 0.03;
        if (h.niche || h.retablo) {
          // el hueco en el muro con su fondo, su repisa y su dintel
          const yb = h.retablo ? Y + 0.62 : Y + 1.0,
            yt = h.retablo ? Y + 2.42 : Y + 2.0;
          seg(h.a0, h.a1, Y, yb);
          seg(h.a0, h.a1, yt, YS);
          wb.box('mossstone', side < 0 ? xk - 0.05 : xk, yb, h.a0, side < 0 ? xk : xk + 0.05, yt, h.a1, { faces: f, ao: false, room, tint: NT });
          wb.box('ashlar', xa, yb - 0.06, h.a0, xb, yb, h.a1, { faces: 't', ao: false, room, tint: AT });
          wb.box('mossstone', xa, yt, h.a0, xb, yt + 0.06, h.a1, { faces: 'b', ao: false, room, tint: NT });
          wb.box('mossstone', xa, yb, h.a0, xb, yt, h.a0 + 0.001, { faces: 's', ao: false, room, tint: NT });
          wb.box('mossstone', xa, yb, h.a1 - 0.001, xb, yt, h.a1, { faces: 'n', ao: false, room, tint: NT });
          // el marco de sillería, por delante
          for (const [za, zb, ya, yb2] of [
            [h.a0 - 0.08, h.a0, yb - 0.06, yt + 0.08],
            [h.a1, h.a1 + 0.08, yb - 0.06, yt + 0.08],
            [h.a0 - 0.08, h.a1 + 0.08, yt, yt + 0.12],
          ])
            wb.box('ashlar', side < 0 ? xf : xf - 0.04, ya, za, side < 0 ? xf + 0.04 : xf, yb2, zb, { ao: false, room, tint: AT });
        }
        if (h.niche) {
          // el canónigo: huesos al fondo, la calavera delante (con su óbolo
          // en la boca: lo pone game/ossuaries.js) y su lápida debajo
          const row = LAP[side + ':' + zc];
          const named = row < 4;
          // (detrás, dos fémures en aspa y unos cuantos más, tendidos)
          const bx = xf + side * 0.38;
          for (const [a, b] of [
            [V3(bx, Y + 1.02, zc - 0.32), V3(bx - side * 0.04, Y + 1.36, zc + 0.3)],
            [V3(bx, Y + 1.02, zc + 0.32), V3(bx - side * 0.04, Y + 1.36, zc - 0.3)],
            [V3(bx + side * 0.03, Y + 1.03, zc - 0.42), V3(bx + side * 0.03, Y + 1.03, zc + 0.4)],
          ])
            bake(boneParts(a, b, 0.02), null);
          const sx = xf + side * 0.2;
          bake(skullParts({ jaw: true, open: 0.22, tint: [0.9, 0.86, 0.78] }), M(sx, Y + 1.1, zc, ry + rng.range(-0.1, 0.1)).multiply(new THREE.Matrix4().makeScale(1.12, 1.12, 1.12)));
          plaque(row, xf - side * 0.012, Y + 0.72, zc, ry);
          // la lamparilla de los que tienen quien les rece (roja, encendida);
          // los olvidados, la suya volcada y vacía
          const lx = xf + side * 0.06,
            lz = zc + 0.36;
          if (named) {
            wb.cylinder('iron', lx, Y + 1.0, lz, 0.04, 0.05, 0.05, 6, { ao: false, capTop: true, room });
            wb.cylinder('candle', lx, Y + 1.05, lz, 0.028, 0.028, 0.05, 6, { ao: false, capTop: true, room, grime: false, tint: [0.9, 0.4, 0.35] });
            if (ctx.fires) ctx.fires.push({ x: lx, y: Y + 1.12, z: lz, s: 0.07, light: false, embers: false, glow: true });
            if (ctx.lights) ctx.lights.push({ x: lx - side * 0.2, y: Y + 1.3, z: lz, r: 1, g: 0.32, b: 0.18, radius: 2.2, intensity: 0.55, room });
          } else {
            wb.push();
            wb.translate(lx, Y + 1.0, lz);
            wb.rotateZ(side * 1.35);
            wb.cylinder('iron', 0, 0, 0, 0.04, 0.05, 0.05, 6, { ao: false, room });
            wb.pop();
          }
          niches.push({ x: sx, z: zc, face: -side, named, row });
        } else if (h.retablo) {
          // el retablo de las ánimas: la tabla en el fondo del hueco, con su
          // marco dorado, y la predela abajo con la portezuela del arca
          const yb = Y + 0.62,
            yt = Y + 2.42;
          wb.geometry('animasRetablo', new THREE.PlaneGeometry(1.36, 1.24), M(xk - side * 0.006, Y + 1.7, zc, ry), { ao: false, room, grime: false });
          const gold = [0.78, 0.6, 0.3];
          for (const [ya, yb2, za, zb] of [
            [Y + 1.04, Y + 1.1, h.a0 + 0.06, h.a1 - 0.06],
            [Y + 2.3, Y + 2.36, h.a0 + 0.06, h.a1 - 0.06],
            [Y + 1.04, Y + 2.36, h.a0 + 0.06, h.a0 + 0.12],
            [Y + 1.04, Y + 2.36, h.a1 - 0.12, h.a1 - 0.06],
          ])
            wb.box('wooddark', side < 0 ? xk : xk - 0.06, ya, za, side < 0 ? xk + 0.06 : xk, yb2, zb, { ao: false, room, tint: gold });
          // la predela (madera dorada), de muro a muro del hueco, con el
          // arca en medio: un hueco con su portezuela (la monta
          // game/ossuaries.js) y, dentro, el objeto bendito
          const pT = [0.72, 0.54, 0.3];
          const pa = xa + 0.04,
            pb = xb - 0.03;
          const pbox = (y0, y1, z0, z1) => wb.box('wooddark', pa, y0, z0, pb, y1, z1, { ao: false, room, tint: pT, faces: 'tnsew' });
          pbox(yb, Y + 1.0, h.a0 + 0.02, zc - 0.22);
          pbox(yb, Y + 1.0, zc + 0.22, h.a1 - 0.02);
          pbox(yb, Y + 0.68, zc - 0.22, zc + 0.22);
          pbox(Y + 0.94, Y + 1.0, zc - 0.22, zc + 0.22);
          wb.box('clothRed', pa, Y + 0.68, zc - 0.22, pb, Y + 0.686, zc + 0.22, { ao: false, room, faces: 't', tint: [0.5, 0.2, 0.18] });
          wb.box('black', side < 0 ? pa : pb - 0.01, Y + 0.68, zc - 0.22, side < 0 ? pa + 0.01 : pb, Y + 0.94, zc + 0.22, { ao: false, room, grime: false, faces: f });
          // dos velones a los lados y la luz roja de las ánimas
          for (const dz of [-0.62, 0.62]) {
            wb.cylinder('candle', xf + side * 0.18, Y + 1.0, zc + dz, 0.035, 0.035, 0.32, 6, { ao: false, capTop: true, room, grime: false });
            if (ctx.fires) ctx.fires.push({ x: xf + side * 0.18, y: Y + 1.35, z: zc + dz, s: 0.1, light: false, embers: false, glow: true });
          }
          if (ctx.lights) ctx.lights.push({ x: xf - side * 0.4, y: Y + 1.6, z: zc, r: 1, g: 0.42, b: 0.24, radius: 4.2, intensity: 0.95, room });
          // el cepillo de las ánimas, a un lado, en su poste (delante de la
          // portezuela no: la tapaba)
          const cx = xf - side * 0.4,
            cz = zc + 0.95;
          wb.box('wooddark', cx - 0.05, Y, cz - 0.05, cx + 0.05, Y + 0.82, cz + 0.05, { ao: false, room });
          wb.box('wooddark', cx - 0.13, Y, cz - 0.13, cx + 0.13, Y + 0.06, cz + 0.13, { ao: false, room });
          wb.box('wooddark', cx - 0.12, Y + 0.82, cz - 0.15, cx + 0.12, Y + 1.06, cz + 0.15, { ao: false, room, tint: [0.62, 0.48, 0.34] });
          wb.box('iron', cx - 0.125, Y + 0.9, cz - 0.155, cx + 0.125, Y + 0.93, cz + 0.155, { ao: false, room });
          wb.box('black', cx - 0.02, Y + 1.061, cz - 0.07, cx + 0.02, Y + 1.062, cz + 0.07, { ao: false, room, grime: false, faces: 't' });
          ctx.col.add(cx - 0.13, Y, cz - 0.15, cx + 0.13, Y + 1.06, cz + 0.15);
          R = { x: xf, zc, cx, cz, side, yb };
        } else {
          // la boca: jambas (con su cara de dentro) y el arco con sus enjutas
          seg(h.a0, h.a0 + sp.ring, Y, Y + sp.h, 's');
          seg(h.a1 - sp.ring, h.a1, Y, Y + sp.h, 'n');
          archRing(ctx, { axis: 'z', c: PZ, w: sp.w, y0: Y + sp.h, rise: sp.rise, ring: sp.ring, t0: xa, t1: xb, top: YS, clip: [h.a0, h.a1], mat: 'ashlar', spMat: 'skullNiches', room, tint: AT, spTint: ST });
        }
        cur = h.a1;
      }
      seg(cur, z1, Y, YS);
    }
    // la bóveda encalada y los fajones sobre sus pilastras
    barrelVault(ctx, { x0, z0, x1, z1, axis: 'z', ys: YS, rise: RISE, mat: 'plaster', tint: [0.6, 0.56, 0.5], room, sub: 1.0, impostTint: AT });
    for (const z of [-115, -123, -131]) {
      archRing(ctx, { axis: 'x', c: 0, w: 4.64, y0: YS, rise: RISE - 0.28, ring: 0.28, t0: z - 0.2, t1: z + 0.2, mat: 'ashlar', room, tint: AT, cam: false });
      pilaster(ctx, x0, z, 'e', Y, YS, { room, tint: AT, w: 0.4, d: 0.18 });
      pilaster(ctx, x1, z, 'w', Y, YS, { room, tint: AT, w: 0.4, d: 0.18 });
    }
    // el testero del norte, con la puerta del sello
    wallFace('skullNiches', x0, Y, z0 - 0.5, -1.5, YS, z0, 's', { tint: ST });
    wallFace('skullNiches', 1.5, Y, z0 - 0.5, x1, YS, z0, 's', { tint: ST });
    lunette(ctx, { axis: 'z', at: z0, c: 0, span: x1 - x0, ys: YS, rise: RISE, face: 1, mat: 'plaster', tint: [0.6, 0.56, 0.5], room, hole: { u0: -1.5, u1: 1.5, y: Y + 3.2 } });
    ceilCol(x0, z0, x1, z1, YS + RISE);
    // velas de ánimas por el suelo, cadenas colgando de la clave y dos lámparas
    for (let z = -113; z > -134; z -= 4) {
      if (Math.abs(z + 120) < 2 || Math.abs(z - RZ + 2) < 1.5) continue;
      P.candles(ctx, z % 8 === 0 ? -2.0 : 2.0, Y, z + 2, 3, Math.round(-z * 3), { room, radius: 3.5, intensity: 0.55, spread: 0.15 });
    }
    for (let z = -115; z > -134; z -= 5) for (let k = 0; k < 8; k++) wb.box('iron', -0.03, YS + RISE - k * 0.14, z - 0.03, 0.03, YS + RISE - 0.1 - k * 0.14, z + 0.03, { ao: false, room });
    for (const z of [-112.6, -127.6]) P.hangingLamp(ctx, 0, YS + RISE, z, { room, len: 0.8, radius: 6.5, intensity: 0.85 });
    P.fleshGrowth(ctx, 1.9, Y, -131.6, 0.7, 1504, { room, climb: 1.4, tendrils: 2, bound: [1.6, 2.4, -132.8, -130.4] });
    ctx.rats.push({ x: 1.4, y: Y, z: -113.5, n: 2 });
    // el cuaderno del sacristán, en un taburete junto al cepillo
    wb.box('wooddark', R.cx + 0.1, Y, RZ - 1.25, R.cx + 0.4, Y + 0.45, RZ - 0.95, { ao: false, room });
    ctx.col.add(R.cx + 0.1, Y, RZ - 1.25, R.cx + 0.4, Y + 0.45, RZ - 0.95);
    L.interact.push({ kind: 'note', id: 'n_sacristan', note: 'animas', model: 'book', x: R.cx + 0.25, y: Y + 0.48, z: RZ - 1.1 });
    // el puzle de las ánimas olvidadas y su objeto bendito
    L.interact.push({ kind: 'item', id: 'i_obolo', item: 'obolo', x: R.x + R.side * 0.2, y: Y + 0.74, z: R.zc, r: 1.4, afterFlag: 'puzzle:se' });
    L.puzzles.push({
      kind: 'animas',
      id: 'se',
      item: 'i_obolo',
      x: 0,
      y: Y,
      z: -121,
      probe: [0, Y + 1.4, -121],
      niches,
      cepillo: { x: R.cx, z: R.cz, y: Y + 1.06 },
      door: { x: R.x, y: Y + 0.68, z: R.zc, side: R.side },
    });
  }

  // --- el sepulcro del arzobispo (al este): su capilla funeraria, bajo la
  // bóveda rebajada con sus dos fajones. Se entra por el tramo del medio, el
  // de las dos puertas (la del osario y, enfrente, la del paso del
  // arzobispo, que baja a la cripta de los mártires), y ese paso queda libre.
  // Al norte, en su estrado, entre cuatro candeleros y bajo sus estandartes,
  // el sepulcro del arzobispo, abierto y vacío: dejó en él su anillo y sus
  // últimas palabras antes de bajar, ya dándose por muerto. Al sur, en fila,
  // los sepulcros de los canónigos de su cabildo. (Antes, el suyo estaba en
  // medio de la sala, en el paso de una puerta a la otra, con un muerto
  // cualquiera dentro, y lo demás, repartido sin orden.)
  {
    const x0 = 3.5,
      x1 = 16,
      z0 = -128,
      z1 = -112;
    const YS = Y + 3.6,
      RISE = 2.2;
    const sp = SIDE_PORTAL;
    C.paint(2.4, -121, 3.6, -119, 1);
    C.paint(x0, z0, x1, z1, 1);
    cryptFloor(2.5, -121, 3.5, -119, Y);
    cryptFloor(x0, z0, x1, z1, Y);
    archedWall(ctx, { axis: 'z', a0: z0, a1: z1, t0: 3.0, t1: x0, y0: Y, y1: YS, openings: [{ c: -120, w: sp.w, h: sp.h, rise: sp.rise, ring: sp.ring, tint: AT }], rooms: [room, room], mat: 'mossstone', tint: CT, collide: false });
    // (al este, la puerta del paso del arzobispo: baja a la cripta de los
    // mártires; ver level_crypt2.js)
    const PA = CRYPT_DOORS.paso;
    archedWall(ctx, { axis: 'z', a0: z0, a1: z1, t0: x1, t1: x1 + 0.5, y0: Y, y1: YS, openings: [{ c: PA.z, w: PA.w, h: PA.h, rise: PA.rise, ring: 0.3, tint: AT }], rooms: [room, room], mat: 'mossstone', tint: CT, collide: false });
    wallFace('mossstone', x0, Y, z0 - 0.5, x1, YS, z0, 's');
    wallFace('mossstone', x0, Y, z1, x1, YS, z1 + 0.5, 'n');
    const c = (x0 + x1) / 2,
      span = x1 - x0;
    barrelVault(ctx, { x0, z0, x1, z1, axis: 'z', ys: YS, rise: RISE, mat: 'mossstone', tint: VT, room, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: z1, c, span, ys: YS, rise: RISE, face: -1, mat: 'mossstone', tint: CT, room });
    lunette(ctx, { axis: 'z', at: z0, c, span, ys: YS, rise: RISE, face: 1, mat: 'mossstone', tint: CT, room });
    for (const z of [-117.3, -122.7]) {
      archRing(ctx, { axis: 'x', c, w: span - 0.4, y0: YS, rise: RISE - 0.3, ring: 0.3, t0: z - 0.22, t1: z + 0.22, mat: 'ashlar', room, tint: AT, cam: false });
      pilaster(ctx, x0, z, 'e', Y, YS, { room, tint: AT, w: 0.5, d: 0.2 });
      pilaster(ctx, x1, z, 'w', Y, YS, { room, tint: AT, w: 0.5, d: 0.2 });
    }
    ceilCol(x0, z0, x1, z1, YS + RISE);
    // el estrado del norte, de un escalón, y en él el sepulcro, de través
    const DZ = -124.6;
    wb.box('ashlar', x0 + 1.2, Y, z0, x1 - 1.2, Y + 0.3, DZ, { faces: 'tsew', sub: 2, aoH: 0.3, room, tint: AT.map((v) => v * 0.92) });
    ctx.col.add(x0 + 1.2, Y, z0, x1 - 1.2, Y + 0.3, DZ);
    // (girado: la tapa corrida, hacia el muro; la boca, hacia quien llega)
    P.sarcophagus(ctx, c, Y + 0.3, -126.3, Math.PI, { open: true, hollow: true, room, l: 1.25, w: 0.6 });
    for (const [x, z] of [
      [x0 + 1.75, DZ - 0.45],
      [x1 - 1.75, DZ - 0.45],
      [x0 + 1.75, z0 + 0.65],
      [x1 - 1.75, z0 + 0.65],
    ])
      P.candelabra(ctx, x, Y + 0.3, z, { room });
    // sus estandartes y su cruz, en el muro
    for (const s of [-1, 1]) P.banner(ctx, c + s * 2.6, YS - 0.15, z0 + 0.1, 0, 'bannerRed', 1.0, 2.4);
    wb.box('bronzeAged', c - 0.08, Y + 1.55, z0, c + 0.08, Y + 3.3, z0 + 0.08, { ao: false, room });
    wb.box('bronzeAged', c - 0.6, Y + 2.62, z0, c + 0.6, Y + 2.78, z0 + 0.08, { ao: false, room });
    // a los lados de la puerta del paso, dos candeleros
    for (const s of [-1, 1]) P.candelabra(ctx, x1 - 0.75, Y, PA.z + s * (PA.w / 2 + 0.75), { room });
    // al sur, los sepulcros de los canónigos, con sus velas
    for (const x of [c - 3.55, c, c + 3.55]) P.sarcophagus(ctx, x, Y, z1 - 1.35, 0, { effigy: true, room, l: 1.0, w: 0.48 });
    P.candles(ctx, c - 1.8, Y, z1 - 2.6, 5, 1505, { room, radius: 4, intensity: 0.8 });
    P.candles(ctx, c + 1.8, Y, z1 - 2.6, 4, 1504, { room, radius: 3.5, intensity: 0.6 });
    P.fleshGrowth(ctx, 15.4, Y, -127.4, 1.0, 1506, { room, climb: 1.8 });
    ctx.rats.push({ x: 4.6, y: Y, z: -113.4, n: 1 });
    P.hangingLamp(ctx, c, YS + RISE, -120, { room, len: 1.9, radius: 9.5, intensity: 1.0 });
    for (const z of [-114.6, -125.4]) {
      P.wallTorch(ctx, x1, Y + 2.6, z, 'w', { room, radius: 7 });
      P.wallTorch(ctx, x0, Y + 2.6, z, 'e', { room, radius: 7 });
    }
    L.interact.push(
      // (en el borde de su sepulcro vacío, del lado de quien llega)
      { kind: 'item', id: 'i_anillo', item: 'anillo', x: c + 0.3, y: Y + 1.25, z: -125.745 },
      // (en el estrado, a los pies del sepulcro)
      { kind: 'note', id: 'n_arzobispo', note: 'arzobispo', x: c - 0.7, y: Y + 0.31, z: -125.15, model: 'paper' }
    );
  }

  // --- el Templo de Bracara (al oeste): la basílica romana que quedó
  // enterrada bajo la Sé, de tres naves, como la de Porta Maggiore en Roma:
  // dos arquerías sobre pilares, bóvedas de cañón estucadas y, al norte, el
  // ábside, con su bóveda de cuarto de esfera (la misma curva de la de la
  // nave, que sigue por ella) y el altar DEO IGNOTO entre dos braseros. Las
  // dos puertas dan al tramo del cruce: al este, la del osario; al oeste, la
  // del paso del panteón (ver panteon.js), en el eje de su corredor. (Antes:
  // columnas sueltas con trozos de arquitrabe colgando en el aire, un techo
  // plano de casetones, un charco de agua de siete metros pintado en el suelo
  // y la puerta del panteón al fondo de un pasadizo torcido.)
  {
    const T = TEMPLO;
    const { x0, x1, z0, z1 } = T;
    const cx = (x0 + x1) / 2,
      hn = T.nave / 2;
    const YS = Y + T.ys;
    const RT = [0.64, 0.62, 0.58],
      ST = [0.8, 0.76, 0.68]; // (el estuco de las bóvedas)
    const sp = SIDE_PORTAL;
    C.paint(-3.6, -121, -2.4, -119, 1);
    C.paint(x0, z0, x1, z1, 1);
    cryptFloor(-3.5, -121, -2.5, -119, Y);
    // el suelo: losas en las naves de los lados y el mosaico en la del medio
    cryptFloor(x0, z0, cx - hn, z1, Y);
    cryptFloor(cx + hn, z0, x1, z1, Y);
    cryptFloor(cx - hn, z0, cx + hn, z1, Y, 'mosaic', [0.62, 0.56, 0.5]);
    // los muros de fuera, hasta el arranque de las bóvedas, con sus puertas
    archedWall(ctx, { axis: 'z', a0: z0, a1: z1, t0: x1, t1: -3.0, y0: Y, y1: YS, openings: [{ c: -120, w: sp.w, h: sp.h, rise: sp.rise, ring: sp.ring, tint: AT }], rooms: [room, room], mat: 'ashlar', tint: RT, collide: false });
    archedWall(ctx, { axis: 'z', a0: z0, a1: z1, t0: x0 - 0.5, t1: x0, y0: Y, y1: YS, openings: [{ c: T.west.z, w: T.west.w, h: 2.2, rise: 1.0, ring: 0.3, tint: AT }], rooms: [room, room], mat: 'ashlar', tint: RT, collide: false });
    wallFace('ashlar', x0, Y, z1, x1, YS, z1 + 0.5, 'n', { tint: RT });
    wallFace('ashlar', x0, Y, z0 - 0.5, cx - hn, YS, z0, 's', { tint: RT });
    wallFace('ashlar', cx + hn, Y, z0 - 0.5, x1, YS, z0, 's', { tint: RT });
    // las dos arquerías: cuatro arcos sobre tres pilares, y sus medios
    // pilares contra los muros del norte y del sur
    const OP = [0, 1, 2, 3].map((k) => ({ c: z0 + T.bay / 2 + k * T.bay, w: T.bay - T.pier, h: 2.6, rise: 1.2, ring: 0.3, tint: AT }));
    for (const ax of [cx - hn - T.pier / 2, cx + hn + T.pier / 2]) archedWall(ctx, { axis: 'z', a0: z0, a1: z1, t0: ax - T.pier / 2, t1: ax + T.pier / 2, y0: Y, y1: YS, openings: OP, rooms: [room, room], mat: 'ashlar', tint: RT.map((v) => v * 1.06) });
    // las bóvedas, todas desde el mismo arranque: la de la nave del medio (que
    // sigue por el ábside) y las de los lados
    const NV = barrelVault(ctx, { x0: cx - hn, x1: cx + hn, z0: z0 + 0.3, z1, axis: 'z', ys: YS, rise: T.rise, mat: 'plaster', tint: ST, room, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: z1, c: cx, span: T.nave, ys: YS, rise: T.rise, face: -1, mat: 'ashlar', tint: RT, room });
    ceilCol(cx - hn, z0, cx + hn, z1, YS + T.rise);
    for (const [a, b] of [
      [x0, cx - hn - T.pier],
      [cx + hn + T.pier, x1],
    ]) {
      barrelVault(ctx, { x0: a, x1: b, z0, z1, axis: 'z', ys: YS, rise: 1.2, mat: 'plaster', tint: ST.map((v) => v * 0.95), room, sub: 1.0, impostTint: AT });
      for (const [at, f] of [
        [z0, 1],
        [z1, -1],
      ])
        lunette(ctx, { axis: 'z', at, c: (a + b) / 2, span: b - a, ys: YS, rise: 1.2, face: f, mat: 'ashlar', tint: RT, room });
      ceilCol(a, z0, b, z1, YS + 1.2);
    }
    // el arco del ábside, al fondo de la nave
    archRing(ctx, { axis: 'x', c: cx, w: 2 * (hn - 0.03), y0: YS, rise: T.rise, ring: 0.35, t0: z0, t1: z0 + 0.3, mat: 'ashlar', room, tint: AT, cam: false });
    // el ábside: el muro (medio cilindro) hasta el arranque, el suelo en
    // abanico y, encima, la bóveda: un casquete de la esfera de la bóveda de la
    // nave (en el arranque, su mismo radio)
    const ar = hn - 0.03;
    const N = 16,
      MR = 6;
    const P2 = (a, r, y) => V(cx + Math.cos(a) * r, y, z0 - Math.sin(a) * r);
    for (let i = 0; i < N; i++) {
      const a0 = (Math.PI * i) / N,
        a1 = (Math.PI * (i + 1)) / N;
      wb.quad('ashlar', P2(a1, ar, Y), P2(a0, ar, Y), P2(a0, ar, YS), P2(a1, ar, YS), { sub: 1.6, aoH: 1.2, aoMin: 0.5, baseY: Y, room, tint: RT });
      wb.tri('flag', V(cx, Y, z0), P2(a0, ar, Y), P2(a1, ar, Y), { room });
      const am = (a0 + a1) / 2,
        m = P2(am, ar + 0.25, Y);
      ctx.col.addOBB(m.x, m.z, ar * Math.sin((a1 - a0) / 2) + 0.06, 0.25, am - Math.PI / 2, Y, YS);
    }
    ctx.col.add(cx - ar, Y - 1, z0 - ar, cx + ar, Y, z0);
    for (let z = z0 - ar; z < z0; z += 0.5)
      for (let x = cx - ar; x < cx + ar; x += 0.5) if (Math.hypot(x + 0.25 - cx, z + 0.25 - z0) < ar - 0.3) C.paint(x, z, x + 0.5, z + 0.5, 1);
    const al0 = Math.acos((YS - NV.yc) / NV.R);
    const SP = (a, al) => V(cx + Math.cos(a) * Math.sin(al) * NV.R, NV.yc + Math.cos(al) * NV.R, z0 - Math.sin(a) * Math.sin(al) * NV.R);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < MR; j++) {
        const a0 = (Math.PI * i) / N,
          a1 = (Math.PI * (i + 1)) / N;
        const l0 = al0 * (1 - j / MR),
          l1 = al0 * (1 - (j + 1) / MR);
        if (j === MR - 1) wb.tri('plaster', SP(a1, l0), SP(a0, l0), SP(a0, 0), { ao: false, room, tint: ST });
        else wb.quad('plaster', SP(a1, l0), SP(a0, l0), SP(a0, l1), SP(a1, l1), { ao: false, sub: 1.0, room, tint: ST });
      }
    // en el ábside, el altar DEO IGNOTO (su letrero, en el frente), con el
    // relicario encima, la carne que le ha crecido detrás y dos braseros; al
    // fondo de las naves de los lados, las dos estatuas veladas
    const az = z0 - 1.55;
    wb.box('ashlar', cx - 1.4, Y, az - 0.6, cx + 1.4, Y + 1.2, az + 0.6, { faces: 'tnsew', sub: 2, room });
    wb.box('ashlar', cx - 1.55, Y + 1.2, az - 0.72, cx + 1.55, Y + 1.38, az + 0.72, { ao: false, room });
    ctx.col.add(cx - 1.55, Y, az - 0.72, cx + 1.55, Y + 1.38, az + 0.72);
    // (DEO IGNOTO tallado en el frente; debajo, un renglón picado a cincel)
    wb.geometry('araDeoIgnoto', new THREE.PlaneGeometry(2.4, 0.6), new THREE.Matrix4().makeTranslation(cx, Y + 0.68, az + 0.606), { ao: false, room, grime: false });
    P.candles(ctx, cx, Y + 1.38, az - 0.15, 7, 1507, { room, radius: 6, intensity: 1.3, spread: 1.0 });
    // (la carne, en su grupo: en la introducción, el templo es el de antes)
    ctx.beginGroup('carneAra');
    P.fleshGrowth(ctx, cx, Y + 1.38, az - 0.45, 1.1, 1508, { room, climb: 2.5, lift: 1.5, bound: [cx - 1.5, cx + 1.5, z0 - ar + 0.1, az + 0.6] });
    ctx.endGroup();
    P.brazier(ctx, cx - 2.0, Y, z0 - 0.55, {});
    P.brazier(ctx, cx + 2.0, Y, z0 - 0.55, {});
    P.veiledStatue(ctx, x0 + 1.5, Y, z0 + 1.2, 0.3, { ped: 1.0, veil: 'burlap' });
    P.veiledStatue(ctx, x1 - 1.5, Y, z0 + 1.2, -0.3, { ped: 1.0, veil: 'burlap' });
    // en la nave, el corro del rito y las lámparas; en los pilares, antorchas
    P.ritual(ctx, cx, Y, -123.5, 1.6, 1510, { room });
    for (const z of [-126.5, -116.5]) P.hangingLamp(ctx, cx, YS + T.rise, z, { room, len: 1.6, radius: 8, intensity: 0.85 });
    for (const s of [-1, 1]) P.wallTorch(ctx, cx + s * hn, Y + 2.2, -122, s < 0 ? 'e' : 'w', { room, radius: 6.5 });
    // en las naves de los lados: ánforas, cascotes del estuco caído y huesos
    for (const [x, z] of [
      [x1 - 0.45, -126.6],
      [x1 - 0.5, -125.9],
      [x1 - 0.45, -114.2],
    ])
      P.jar(ctx, x, Y, z, 1, { room });
    P.rubble(ctx, x0 + 1.3, Y, -127.3, 5, 1511, 0.8, { mat: 'ashlar' });
    P.bones(ctx, -5.6, Y, -113.6, 10, 1509, 1.0);
    ctx.rats.push({ x: -5.4, y: Y, z: -113.2, n: 2 });
    for (const z of [-129.5, -114.5]) {
      P.wallTorch(ctx, x0, Y + 2.6, z, 'e', { room, radius: 7.5 });
      P.wallTorch(ctx, x1, Y + 2.6, z, 'w', { room, radius: 7.5 });
    }
    L.interact.push(
      { kind: 'note', id: 'n_romana', note: 'romana', x: cx, y: Y + 1.0, z: az + 0.75, model: 'wall', r: 1.8 },
      { kind: 'item', id: 'i_relicario2', item: 'relicario', x: cx - 1.0, y: Y + 1.58, z: az - 0.1 }
    );
  }

  // (la puerta del jefe ya no está al fondo del osario: es la Puerta del Dios
  // Ignoto, en la antesala, al oeste de la cisterna; ver level_crypt2.js)

  // --- la cisterna (arena del jefe final): el santuario del Dios
  // Desconocido, tras la puerta de la antesala: el paso, el pasillo de las
  // columnas y el círculo con la fuente y la estatua (ver sanctum.js)
  buildSanctum(ctx, C, L);

  // --- enemigos de la cripta
  L.enemies.push(
    { type: 'crawler', x: 0, y: Y + 3.2, z: -118, yaw: 0, idle: 'ceiling', id: 'e_cr1' },
    { type: 'penitent', x: 1.2, y: Y, z: -128, yaw: Math.PI, idle: 'pray', id: 'e_cr2' },
    { type: 'soldier', x: 7.5, y: Y, z: -118, yaw: -Math.PI / 2, idle: 'stand', id: 'e_cr3' },
    { type: 'soldier', x: 13, y: Y, z: -122, yaw: -Math.PI / 2, idle: 'stand', id: 'e_cr4' },
    { type: 'mourner', x: -11, y: Y, z: -126, yaw: 0, idle: 'stand', id: 'e_cr5' },
    { type: 'crawler', x: -16, y: Y, z: -115, yaw: 1, idle: 'stand', id: 'e_cr6' },
    { type: 'bell', x: -6, y: Y, z: -119.5, yaw: -1.5, idle: 'wander', id: 'e_cr7' }
  );

  wb.setRoom(null);

  L.phantoms.push({ x: 0, y: Y, z: -130.5, trigger: [0, Y, -113], kind: 'mourner' });
  L.zones.push(
    { id: 'tomb', rects: [[3.5, -128, 16, -112, -8, -1]], atmo: 'crypt', room: 'crypt' },
    { id: 'roman', rects: [[-19, -132, -3.5, -112, -8, -1], [-14.5, -135, -8, -132, -8, -1]], atmo: 'crypt', room: 'crypt' },
    { id: 'ossuary', rects: [[-2.5, -133.5, 2.5, -110, -8, -2]], atmo: 'crypt', room: 'crypt' },
    { id: 'crypt', rects: [[-7, -110, 7, -97, -8, -1.5], [-2, -97, 2, -86, -8, -1.3]], atmo: 'crypt', room: 'crypt' }
  );
  L.map.push(
    { id: 'crypt', r: [-7, -110, 7, -97], level: 'crypt' },
    { id: 'crypt', r: [-2, -97, 2, -86], level: 'crypt' },
    { id: 'ossuary', r: [-2.5, -133, 2.5, -110], level: 'crypt' },
    { id: 'tomb', r: [3.5, -128, 16, -112], level: 'crypt' },
    { id: 'roman', r: [-19, -132, -3.5, -112], level: 'crypt' },
    { id: 'roman', r: [-14.5, -135, -8, -132], level: 'crypt' }
  );
}

// ======================================================================== RÍO / FINAL
// La orilla del Este al amanecer, donde acaba el juego: la boca de la galería
// en el muro, la ribera con su embarcadero y la barca amarrada, el río (agua
// de verdad, con el reflejo del sol) y, enfrente, la otra orilla: el prado,
// los chopos, un cruceiro junto al camino, una ermita en el alto y las
// sierras detrás. RIVER: el embarcadero, el camino que se anda en la escena
// final (de la boca del embarcadero a su punta) y dónde está la barca.
export const RIVER = {
  dock: { x0: 6.1, x1: 8.3, z0: -206.8, z1: -221.4 },
  path: [
    [5.6, -206.4],
    [7.2, -208.4],
    [7.2, -219.6],
  ],
  boat: [9.62, -219.2, 0.1],
};

export function buildRiver(ctx, S, L) {
  const wb = ctx.wb;
  const DK = RIVER.dock;
  // la orilla baja hacia el agua a partir de z=-212: no se camina por el aire
  // (y el embarcadero, que se anda hasta la punta)
  W(S, -30, -212.2, 30, -196);
  W(S, DK.x0 + 0.2, DK.z1 + 0.2, DK.x1 - 0.2, -212.2);
  // fuera del muro, sin la losa de suelo de la ciudad (su capa de tierra, a
  // ras de cero, tapaba el agua hasta veinte metros dentro del río): el suelo
  // que se pisa, la ribera y el tablero del embarcadero
  ctx.floorHoles.push([-96, -232, 84, -196.5]);
  ctx.col.add(-30, -1, -212.2, 30, 0, -196).cam = true;
  ctx.col.add(DK.x0, -0.4, DK.z1, DK.x1, 0, -212.2);
  const rng = new RNG(1701);
  // orilla: malla de alturas (plana donde se camina, baja hacia el agua)
  const hgt = (x, z) => {
    const n = Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.12 + Math.sin(x * 0.07 + z * 0.05) * 0.2;
    const shore = z < -212 ? -(-212 - z) * 0.22 : 0;
    const side = Math.max(0, Math.abs(x) - 32) * 0.12;
    return n * (Math.abs(x) < 30 && z > -212 ? 0.3 : 1) + shore + side;
  };
  const GX = 44,
    GZ = 22;
  const g = new THREE.PlaneGeometry(120, 48, GX, GZ);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -220);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setY(i, hgt(pa.getX(i), pa.getZ(i)));
  g.computeVertexNormals();
  wb.geometry('dirt', g, null, { ao: false, uvScale: 18, tint: [0.72, 0.78, 0.56] });
  // matas de hierba: briznas finas inclinadas
  for (let i = 0; i < 150; i++) {
    const x = rng.range(-50, 50),
      z = rng.range(-213, -197);
    const y = hgt(x, z);
    const n = rng.int(4, 7);
    for (let k = 0; k < n; k++) {
      const h = rng.range(0.25, 0.7);
      wb.push();
      wb.translate(x + rng.range(-0.2, 0.2), y, z + rng.range(-0.2, 0.2));
      wb.rotateY(rng.range(0, 3.14));
      wb.rotateZ(rng.range(-0.45, 0.45));
      wb.box('straw', -0.012, 0, -0.012, 0.012, h, 0.012, { ao: false, tint: [0.36, 0.48, 0.24], grime: false });
      wb.pop();
    }
  }
  // el río: agua con su corriente, el cielo del amanecer reflejado y el
  // camino de brillos del sol (antes, una caja con la textura del agua)
  if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [-170, -345, 170, -212.6], y: -1.0, deep: 0x1a262c, sky: 0xe8b090, glint: 0xffe2b4, light: [294, 236, -2179], lightK: 1.5, amp: 0.06, flow: [0.45, 0.05], drips: false });
  // juncos en la orilla, en matas
  for (let i = 0; i < 26; i++) {
    const cx = rng.range(-55, 55),
      cz = rng.range(-217.5, -212.5);
    if (cx > 3.5 && cx < 12) continue; // (el embarcadero y la barca)
    const n = rng.int(4, 9);
    for (let k = 0; k < n; k++) {
      const x = cx + rng.range(-0.7, 0.7),
        z = cz + rng.range(-0.5, 0.5);
      const hh = rng.range(0.8, 1.9);
      wb.push();
      wb.translate(x, hgt(x, z) - 0.2, z);
      wb.rotateZ(rng.range(-0.3, 0.3));
      wb.rotateX(rng.range(-0.2, 0.2));
      wb.box('straw', -0.018, 0, -0.018, 0.018, hh, 0.018, { ao: false, tint: [0.5, 0.62, 0.35], grime: false });
      if (rng.chance(0.4)) wb.box('leather', -0.035, hh - 0.25, -0.035, 0.035, hh, 0.035, { ao: false });
      wb.pop();
    }
  }
  // cantos rodados en la orilla, unos fuera y otros a medias en el agua, y
  // dos troncos que trajo la crecida
  for (let i = 0; i < 130; i++) {
    const x = rng.range(-46, 46),
      z = rng.range(-217.4, -211.6);
    if (x > 5.6 && x < 11.4 && z < -212.5) continue;
    const s = rng.range(0.08, 0.32) * (rng.chance(0.12) ? 1.8 : 1);
    P.roughStone(ctx, x, hgt(x, z), z, s, 1720 + i, { mat: 'rock', sink: 0.35, tint: [0.92, 0.9, 0.86] });
  }
  for (const [x, z, r, len] of [
    [-9.5, -213.6, 0.4, 3.2],
    [16.5, -213.2, -0.25, 2.6],
  ]) {
    wb.push();
    wb.translate(x, hgt(x, z) + 0.12, z);
    wb.rotateY(r);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('wooddark', 0, -len / 2, 0, 0.16, 0.2, len, 7, { ao: false, capTop: true, capBot: true, tint: [0.72, 0.66, 0.6] });
    wb.pop();
  }
  // muro de contención con la boca de la galería
  const wall = (x0, x1) => {
    wb.box('mossstone', x0, -1, -196.4, x1, 5, -194, { sub: 2, aoH: 1.5 });
    ctx.col.add(x0, -1, -196.4, x1, 5, -194);
  };
  wall(-60, -2.6);
  wall(2.6, 60);
  // la boca de la galería: un arco de medio punto con su rosca, del mismo
  // perfil que la bóveda de dentro, y el muro hasta arriba por las dos caras
  // (antes, un hueco recto con unas dovelas pegadas delante: por las esquinas
  // de arriba se veía, detrás de la bóveda, el vacío)
  for (const x of [-2.6, 2]) wb.box('mossstone', x, 0, -196.4, x + 0.6, 2.0, -194, { sub: 2, faces: 'ns' });
  // (entre el borde del muro y el trasdós de la rosca, hasta arriba)
  for (const x of [-2.6, 2.42]) wb.box('mossstone', x, 2.0, -196.4, x + 0.18, 5, -194, { sub: 2, faces: 'ns' });
  archRing(ctx, { axis: 'x', c: 0, w: 4, y0: 2.0, rise: 2.0, ring: 0.42, t0: -196.4, t1: -194, top: 5, clip: [-2.6, 2.6], mat: 'ashlar', spMat: 'mossstone', rooms: [undefined, 'tunnel'], tint: [0.8, 0.78, 0.72], spTint: [0.78, 0.8, 0.74], proud: 0.05 });
  ctx.col.add(-2.6, 3.9, -196.4, 2.6, 5, -194);
  wb.box('mossstone', -60, 5, -196.4, 60, 5.4, -194.5, { ao: false });
  // reja arrancada en el suelo
  wb.push();
  wb.translate(1.2, 0.05, -198.5);
  wb.rotateY(0.4);
  for (let x = -1.6; x <= 1.6; x += 0.3) wb.box('iron', x - 0.03, 0, -1.5, x + 0.03, 0.06, 1.5, { ao: false });
  wb.pop();
  // el campo de fuera de la muralla norte: a ras de la ciudad junto al muro
  // y alrededor del cráter (por ahí sale el gigante, y desde el adarve y las
  // torres se ve el cráter abierto), y la ladera que sube hacia el río y
  // vuelve a bajar a la orilla. Una malla de alturas a cuadros, sin el cuadro
  // del cráter (lo pone level_finale.js: entero o reventado); hacia él, la
  // tierra del color de la de su borde
  {
    const C = CISTERN.CRATER,
      cz = CISTERN.cz;
    const smt = (a, b, t) => {
      const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
      return u * u * (3 - 2 * u);
    };
    const edge = (x, z) => Math.max(Math.abs(x) - C, Math.abs(z - cz) - C, 0);
    const hN = (x, z) => {
      const d = -z;
      let h = -0.06 + 6.7 * smt(171, 185, d) - 1.64 * smt(186, 194.5, d);
      h += (Math.sin(x * 0.23 + z * 0.17) * 0.14 + Math.sin(x * 0.09 - z * 0.11) * 0.22) * smt(1.5, 6, edge(x, z)) * (1 - smt(190, 194.5, d));
      return h;
    };
    const steps = (pts, n) => pts.slice(1).flatMap((b, i) => Array.from({ length: n[i] }, (_, k) => pts[i] + ((b - pts[i]) * (k + 1)) / n[i]));
    const xs = [-70, ...steps([-70, -C, C, 70], [25, 12, 25])];
    const zs = [-194.5, ...steps([-194.5, cz - C, cz + C, -126.1], [13, 12, 6])];
    const T0 = [0.56, 0.5, 0.46],
      T1 = [0.6, 0.66, 0.5];
    for (let i = 0; i < xs.length - 1; i++)
      for (let j = 0; j < zs.length - 1; j++) {
        const x0 = xs[i],
          x1 = xs[i + 1],
          za = zs[j],
          zb = zs[j + 1];
        const mx = (x0 + x1) / 2,
          mz = (za + zb) / 2;
        if (Math.abs(mx) < C && Math.abs(mz - cz) < C) continue;
        const k = smt(1, 9, edge(mx, mz));
        const tint = T0.map((v, c) => v + (T1[c] - v) * k);
        wb.quad('dirt', new THREE.Vector3(x0, hN(x0, za), za), new THREE.Vector3(x0, hN(x0, zb), zb), new THREE.Vector3(x1, hN(x1, zb), zb), new THREE.Vector3(x1, hN(x1, za), za), { ao: false, tint, uv: 0.35 });
      }
  }
  // (la muralla norte de la ciudad, recortada contra el cielo con la Sé
  // detrás, la levanta level_walls.js: por su adarve corre la persecución)

  // --- la otra orilla: el talud, el prado y las sierras (una malla de
  // alturas con su hierba; antes, unos triángulos planos a lo lejos)
  const FZ = -258; // la orilla de enfrente
  const fh = (x, z) => {
    const d = FZ - z; // tierra adentro
    const sm = (a, b, t) => {
      const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
      return u * u * (3 - 2 * u);
    };
    let h = -1.7 + 2.2 * sm(-2, 4.5, d);
    h += 0.035 * Math.max(0, d - 4.5);
    h += (Math.sin(x * 0.19 + z * 0.13) * 0.25 + Math.sin(x * 0.07 - z * 0.05) * 0.4) * sm(2, 10, d);
    const ridge = 11 + 8 * Math.sin(x * 0.021 + 0.6) + 5 * Math.sin(x * 0.055 + 2.1) + 2.5 * Math.sin(x * 0.13 + z * 0.04);
    h += sm(28, 85, d) * ridge;
    return h;
  };
  {
    const FX0 = -230,
      FX1 = 230,
      FZ0 = FZ + 3,
      FZ1 = FZ - 150;
    const nx = 92,
      nz = 40;
    const fg = new THREE.PlaneGeometry(FX1 - FX0, FZ0 - FZ1, nx, nz);
    fg.rotateX(-Math.PI / 2);
    fg.translate((FX0 + FX1) / 2, 0, (FZ0 + FZ1) / 2);
    const fp = fg.attributes.position,
      fu = fg.attributes.uv;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i),
        z = fp.getZ(i);
      fp.setY(i, fh(x, z));
      fu.setXY(i, x / 6, z / 6);
    }
    fg.computeVertexNormals();
    wb.geometry('grass', fg, null, { ao: false, uvScale: 1, tint: [0.92, 0.96, 0.86] });
  }
  // chopos a lo largo de la orilla, árboles de copa por el prado y el monte
  {
    const tr = new RNG(1760);
    for (let x = -120; x < 120; x += tr.range(5, 11)) {
      if (Math.abs(x - 12) < 7) continue; // (el cruceiro, a contraluz)
      const z = FZ - tr.range(3.5, 6.5);
      P.leafyTree(ctx, x, fh(x, z), z, tr.range(9, 13), 1761 + Math.round(x * 3), { poplar: true, tint: [0.86, 0.98, 0.82] });
    }
    for (let i = 0; i < 38; i++) {
      const x = tr.range(-140, 140),
        z = FZ - tr.range(12, 70);
      if (Math.abs(x - 12) < 9 && z > FZ - 25) continue;
      P.leafyTree(ctx, x, fh(x, z), z, tr.range(6, 10), 1800 + i, { tint: [0.92, 0.95, 0.84] });
    }
    for (let i = 0; i < 26; i++) {
      const x = tr.range(-160, 160),
        z = FZ - tr.range(75, 120);
      P.leafyTree(ctx, x, fh(x, z), z, tr.range(7, 11), 1850 + i, { tint: [0.8, 0.88, 0.8] });
    }
  }
  // el camino de la otra orilla, a lo largo del río
  {
    const zc = (x) => FZ - 14 + Math.sin(x * 0.045) * 2.5;
    for (let x = -150; x < 150; x += 3) {
      const xa = x,
        xb = x + 3;
      const pa2 = V(xa, fh(xa, zc(xa) + 1.4) + 0.06, zc(xa) + 1.4),
        pb2 = V(xb, fh(xb, zc(xb) + 1.4) + 0.06, zc(xb) + 1.4),
        pc = V(xb, fh(xb, zc(xb) - 1.4) + 0.06, zc(xb) - 1.4),
        pd = V(xa, fh(xa, zc(xa) - 1.4) + 0.06, zc(xa) - 1.4);
      wb.quad('dirt', pa2, pb2, pc, pd, { ao: false, sub: 3, tint: [0.92, 0.84, 0.72] });
    }
  }
  // el cruceiro junto al camino, enfrente del embarcadero: a contraluz del sol
  {
    const cx = 12.6,
      cz = FZ - 9.5;
    const y0 = fh(cx, cz) - 0.15;
    const CT2 = [0.82, 0.8, 0.76];
    for (const [r, h] of [
      [1.25, 0.32],
      [0.95, 0.3],
      [0.65, 0.3],
    ]) {
      const yb = y0 + (r === 1.25 ? 0 : r === 0.95 ? 0.32 : 0.62);
      wb.box('ashlar', cx - r, yb, cz - r, cx + r, yb + h, cz + r, { ao: false, tint: CT2, faces: 'tnsew', sub: 2 });
    }
    const yp = y0 + 0.92;
    wb.box('ashlar', cx - 0.32, yp, cz - 0.32, cx + 0.32, yp + 0.45, cz + 0.32, { ao: false, tint: CT2 });
    wb.box('ashlar', cx - 0.15, yp + 0.45, cz - 0.15, cx + 0.15, yp + 3.3, cz + 0.15, { ao: false, tint: CT2 });
    wb.box('ashlar', cx - 0.24, yp + 3.3, cz - 0.24, cx + 0.24, yp + 3.5, cz + 0.24, { ao: false, tint: CT2 });
    wb.box('ashlar', cx - 0.11, yp + 3.5, cz - 0.11, cx + 0.11, yp + 4.55, cz + 0.11, { ao: false, tint: CT2 });
    wb.box('ashlar', cx - 0.56, yp + 3.9, cz - 0.1, cx + 0.56, yp + 4.12, cz + 0.1, { ao: false, tint: CT2 });
  }
  // la ermita, en el alto: muros encalados, tejado a dos aguas y espadaña
  {
    const ex = -36,
      ez = FZ - 58;
    const y0 = fh(ex, ez) - 0.3;
    const wt2 = [1.0, 0.96, 0.9];
    wb.box('plaster', ex - 2.6, y0, ez - 4, ex + 2.6, y0 + 3.6, ez + 4, { ao: false, tint: wt2, sub: 2, faces: 'nsew' });
    solidGableRoof(ctx, ex - 2.6, ez - 4, ex + 2.6, ez + 4, y0 + 3.6, y0 + 5.4, 'z', { overhang: 0.35, gableOverhang: 0.25, thick: 0.18, wallMat: 'plaster', wallT: 0.3, wallTint: wt2, cam: false });
    // la espadaña sobre la fachada (mira al río) con su campana
    const fzE = ez + 4;
    wb.box('plaster', ex - 1.2, y0 + 3.6, fzE - 0.35, ex - 0.45, y0 + 7.0, fzE, { ao: false, tint: wt2 });
    wb.box('plaster', ex + 0.45, y0 + 3.6, fzE - 0.35, ex + 1.2, y0 + 7.0, fzE, { ao: false, tint: wt2 });
    wb.box('plaster', ex - 1.2, y0 + 7.0, fzE - 0.35, ex + 1.2, y0 + 7.6, fzE, { ao: false, tint: wt2 });
    churchBell(ctx, new THREE.Matrix4().makeTranslation(ex, y0 + 5.82, fzE - 0.18), 0.74);
    wb.box('iron', ex - 0.03, y0 + 6.36, fzE - 0.21, ex + 0.03, y0 + 7.0, fzE - 0.15, { ao: false });
    wb.box('wooddark', ex - 0.7, y0, fzE, ex + 0.7, y0 + 2.3, fzE + 0.02, { faces: 's', ao: false });
  }

  // --- el embarcadero: tablero de tablas sobre largueros y pilotes, con un
  // noray en la punta; se anda hasta el final (antes, unas tablas al aire)
  {
    const { x0, x1, z0, z1 } = DK;
    const yT = 0.0;
    for (let z = z0; z > z1 + 0.01; z -= 0.3) {
      const za = Math.max(z1, z - 0.27);
      const lift = rng.range(-0.02, 0.01);
      wb.box('planks', x0, yT - 0.08 + lift, za, x1, yT + lift, z, { faces: 'tnsewb', ao: false, uv: 0.7, tint: [0.78, 0.7, 0.6].map((v) => v * rng.range(0.9, 1.08)) });
    }
    for (const x of [x0 + 0.25, x1 - 0.25]) wb.box('wooddark', x - 0.09, yT - 0.3, z1, x + 0.09, yT - 0.08, z0, { ao: false, faces: 'nsewb' });
    for (let z = z0 - 0.6; z > z1 - 0.1; z -= 2.4) {
      for (const x of [x0 - 0.06, x1 + 0.06]) {
        const yb = Math.min(-1.6, hgt(x, z) - 0.4);
        wb.cylinder('wooddark', x, yb, z, 0.12, 0.13, yT + 0.55 - yb, 6, { ao: false, capTop: true, tint: [0.7, 0.64, 0.58] });
        ctx.col.add(x - 0.13, yT, z - 0.13, x + 0.13, yT + 0.55, z + 0.13);
      }
      wb.box('wooddark', x0 - 0.1, yT - 0.42, z - 0.08, x1 + 0.1, yT - 0.3, z + 0.08, { ao: false, faces: 'nsewb' });
    }
    // el noray de la punta y la amarra de la barca
    wb.cylinder('wooddark', (x0 + x1) / 2, yT, z1 + 0.35, 0.16, 0.16, 0.55, 8, { ao: false, capTop: true });
    const [bx, bz, br] = RIVER.boat;
    P.rowboat(ctx, bx, -1.22, bz, br);
    const bow = V(bx + Math.sin(br) * -2.0, -0.45, bz + Math.cos(br) * -2.0);
    beam(ctx, 'rope', V(x1 + 0.06, yT + 0.45, z1 + 0.5), bow, 0.035);
    beam(ctx, 'rope', V(x1 + 0.06, yT + 0.4, -214.6), V(bx + Math.sin(br) * 1.9, -0.5, bz + Math.cos(br) * 1.9), 0.035);
  }
  // rocas y árboles muertos en la ribera
  P.rubble(ctx, -14, 0, -206, 7, 1702, 2.4, { mat: 'wallstone', scale: 2 });
  P.rubble(ctx, 18, 0, -203, 6, 1703, 2, { mat: 'wallstone', scale: 2.4 });
  P.deadTree(ctx, -22, 0, -201, 1704, 6.5);
  P.deadTree(ctx, 25, 0, -208, 1705, 5);
  // humo de la ciudad que arde a lo lejos (los fuegos, sobre el talud)
  for (const [x, z, y] of [
    [-40, -150, 7.15],
    [10, -140, 5.25],
    [45, -160, 7.1],
  ])
    ctx.fires.push({ x, y, z, s: 2.8, smoke: true, light: false, embers: false, glow: false });
  ctx.crows.push({ x: -7.5, y: 0, z: -204.5, r: 2, n: 5 });
  // cuervos posados en los pilotes del embarcadero
  ctx.crows.push({
    pts: [
      [DK.x0 - 0.06, 0.55, -209.2],
      [DK.x1 + 0.06, 0.55, -211.6],
      [DK.x0 - 0.06, 0.55, -216.4],
    ],
    yaw: Math.PI / 2,
  });
  L.interact.push({ kind: 'trigger', id: 't_final', x: 0, y: 0, z: -207.5, r: 30, rz: 3.5, event: 'ending' });
  L.zones.push({ id: 'river', rects: [[-240, -420, 240, -196.4, -3, 60]], atmo: 'dawn' });
  L.map.push({ id: 'river', r: [-30, -222, 30, -196] });
}
