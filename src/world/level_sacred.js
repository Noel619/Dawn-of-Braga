// Catedral de Braga, claustro, cripta (osario, templo romano, sepulcro),
// cisterna del jefe final, galería y orillas del río.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, stairs, merlons, cityWall, tower, archWall, stoneWall, archRing, archedWall, barrelVault, rampVault, lunette, dome, pilaster, beam, solidGableRoof } from './builders.js';
import * as P from './props.js';
import { floor, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { cisternPit, cisternRuins } from './level_finale.js';

const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

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
    wb.box('ashlar', -2.2, 0.0, -0.06, 2.2, 0.12, 0.06, { ao: false });
    wb.pop();
  }
  wb.pop();
  // la campana de la torre este, tumbada entre los escombros
  wb.push();
  wb.translate(12.4, 1.05, -53.2);
  wb.rotateY(-0.5);
  wb.rotateZ(Math.PI / 2 - 0.22);
  wb.cylinder('bronze', 0, -0.9, 0, 1.1, 0.55, 1.8, 10, { ao: false, capTop: true });
  wb.pop();
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
  tower(ctx, -9, -60, 8, 24, { mat: 'ashlar', roof: 'pyramid' });
  tower(ctx, 9, -60, 8, 24, { mat: 'ashlar', roof: 'pyramid' });
  for (const cx of [-9, 9]) {
    for (const [dx, dz, ax] of [
      [0, 4.02, 'z'],
      [0, -4.02, 'z'],
      [4.02, 0, 'x'],
      [-4.02, 0, 'x'],
    ]) {
      const x = cx + dx,
        z = -60 + dz;
      if (ax === 'z') wb.box('black', x - 1, 17.5, z - 0.02, x + 1, 21, z + 0.02, { ao: false, grime: false });
      else wb.box('black', x - 0.02, 17.5, z - 1, x + 0.02, 21, z + 1, { ao: false, grime: false });
    }
  }
  // campana visible en la torre este
  wb.cylinder('bronze', 9, 18.2, -60, 1.1, 0.55, 1.8, 10, { ao: false, capTop: true });
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
  // fachada con portada
  archWall(ctx, -5, 5, -61.5, -60, 18, 0, 3.2, 4.6, { mat: 'ashlar', slices: 8 });
  // tímpano de piedra que cierra el medio punto sobre las hojas de la puerta
  // (las hojas rectangulares no caben en el arco: antes lo atravesaban)
  {
    const R = 1.6,
      spring = 4.6 - R,
      N = 8;
    for (let i = 0; i < N; i++) {
      const u0 = -R + (i / N) * 2 * R,
        u1 = -R + ((i + 1) / N) * 2 * R;
      const um = (u0 + u1) / 2;
      const yy = spring + Math.sqrt(Math.max(0, R * R - um * um));
      wb.box('ashlar', u0, spring, -60.12, u1, yy, -60.0, { ao: false, faces: 'nsbew', tint: [0.8, 0.78, 0.74] });
    }
    const tb = ctx.col.add(-R, spring, -60.12, R, spring + R, -60.0);
    tb.noSight = true;
  }
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
  // (los muros, en dos: lo de arriba va con el tejado en el grupo 'naveRoof',
  // que revienta cuando sale Deo Ignoto; las ruinas, en 'naveRuin', al final)
  const CUT = 11.6;
  const nave = (x0, z0, x1, z1) => {
    solid(ctx, 'ashlar', x0, 0, z0, x1, CUT, z1, { sub: 2.2, aoH: 2 });
    ctx.beginGroup('naveRoof');
    solid(ctx, 'ashlar', x0, CUT, z0, x1, 14, z1, { sub: 2.2, ao: false });
    ctx.endGroup();
  };
  nave(-13, -104, -11, -64);
  nave(11, -104, 13, -81);
  nave(11, -79, 13, -64);
  solid(ctx, 'ashlar', 11, 3.2, -81, 13, CUT, -79, { sub: 2, ao: false, faces: 'tnsewb' });
  ctx.beginGroup('naveRoof');
  solid(ctx, 'ashlar', 11, CUT, -81, 13, 14, -79, { sub: 2, ao: false, faces: 'tnsewb' });
  ctx.endGroup();
  nave(-13, -108, 13, -104);
  // cabecera poligonal
  solid(ctx, 'ashlar', -7, 0, -112, 7, 12, -108, { sub: 2.2 });
  ctx.beginGroup('naveRoof');
  wb.pyramid('roof', 0, -110, 15, 5, 12, 3);
  // (con grueso, alero y tablas de remate: antes, un plano de papel; el
  // hastial de delante, sólo lo que asoma por encima de la fachada)
  solidGableRoof(ctx, -13, -108, 13, -60, 14, 20, 'z', { overhang: 0.8, gableOverhang: 0.3, thick: 0.28, wallMat: 'ashlar', wallT: 0.6, gables: [{}, { y0: 18, t: 1.5 }], room });
  ctx.endGroup();
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
  lancet(ctx, 0, -103.98, 'z', 5, 7, 2.2);
  if (ctx.shafts) ctx.shafts.push({ a: [0, 9, -103.9], b: [0, 1.2, -95], w: 2.0, color: 0xff3a28 });
  lancet(ctx, -4, -103.98, 'z', 6, 5, 1.2);
  lancet(ctx, 4, -103.98, 'z', 6, 5, 1.2);

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
  // arquerías de la nave (dos filas)
  const bays = 6;
  const za = -95,
    zb = -66;
  const bw = (zb - za) / bays;
  // la nave central, cubierta con una bóveda de cañón con sus fajones; las
  // laterales, con techo de vigas; sobre las arquerías, el muro sube hasta el
  // arranque de la bóveda (antes, un techo llano de una sola cara a catorce
  // metros, al que no llegaba la luz: se veía negro, como el vacío)
  const YV = 12.6,
    RV = 4.0;
  const VT = [0.86, 0.83, 0.78],
    FT = [0.94, 0.9, 0.84];
  for (const x of [-5.5, 5.5]) {
    for (let i = 0; i < bays; i++) {
      const a0 = za + i * bw;
      archWall(ctx, a0, a0 + bw, x - 0.45, x + 0.45, 11, a0 + bw / 2, bw - 1.2, 7.6, { axis: 'z', mat: 'ashlar', slices: 8, vmat: 'ashlar' });
    }
    // (algo más gruesos que el machón del arco que se apoya en ellos: con la
    // cara en el mismo plano parpadeaban)
    solid(ctx, 'ashlar', x - 0.6, 0, za - 0.62, x + 0.6, 11, za + 0.62, { sub: 2 });
    solid(ctx, 'ashlar', x - 0.6, 0, zb - 0.62, x + 0.6, 11, zb + 0.62, { sub: 2 });
    // los tramos de los extremos: un arco ancho sobre el presbiterio y, a
    // poniente, el muro hasta las torres
    archWall(ctx, -104, za - 0.62, x - 0.45, x + 0.45, 11, -99.8, 5.6, 8.6, { axis: 'z', mat: 'ashlar', slices: 9, vmat: 'ashlar' });
    solid(ctx, 'ashlar', x - 0.45, 0, zb + 0.62, x + 0.45, 11, -64, { sub: 2, faces: 'ew' });
    // el muro de encima de las arquerías, hasta el arranque de la bóveda
    ctx.beginGroup('naveRoof');
    solid(ctx, 'ashlar', x - 0.45, 11, -104, x + 0.45, YV, -64, { sub: 2, faces: 'ew' });
    ctx.endGroup();
  }
  ctx.beginGroup('naveRoof');
  barrelVault(ctx, { x0: -5.05, z0: -104, x1: 5.05, z1: -61.5, axis: 'z', ys: YV, rise: RV, mat: 'ashlar', tint: VT, room, sub: 1.6, impostTint: FT });
  // (sobre el muro de la cabecera, que llega a 14 m, el testero de la bóveda)
  lunette(ctx, { axis: 'z', at: -104, c: 0, span: 10.1, ys: YV, rise: RV, face: 1, mat: 'ashlar', tint: VT, room, hole: { u0: -6, u1: 6, y: 14 } });
  ctx.col.add(-5.05, YV + RV, -104, 5.05, YV + RV + 0.4, -61.5).cam = true;
  ctx.endGroup();
  // fajones, sobre ménsulas en el muro y, en los machones de las arquerías,
  // sobre columnas adosadas que bajan hasta el suelo
  for (const z of [-99.8, ...Array.from({ length: bays + 1 }, (_, i) => za + i * bw), -64.6]) {
    ctx.beginGroup('naveRoof');
    archRing(ctx, { axis: 'x', c: 0, w: 9.9, y0: YV, rise: RV - 0.22, ring: 0.32, t0: z - 0.26, t1: z + 0.26, mat: 'ashlar', room, tint: FT, cam: false, n: 15 });
    ctx.endGroup();
    for (const sx of [-1, 1]) {
      const xf = sx * 5.05;
      // (sin cara de arriba: ahí asientan la imposta y el fajón)
      ctx.beginGroup('naveRoof');
      wb.box('ashlar', Math.min(xf, xf - sx * 0.32), YV - 0.42, z - 0.3, Math.max(xf, xf - sx * 0.32), YV, z + 0.3, { ao: false, room, tint: FT, faces: sx < 0 ? 'nseb' : 'nswb' });
      ctx.endGroup();
      if (z > za + 0.1 && z < zb - 0.1) pilaster(ctx, xf, z, sx < 0 ? 'e' : 'w', FY, YV - 0.42, { room, tint: FT, w: 0.42, d: 0.14 });
    }
  }
  // las naves laterales: techo de tablas sobre vigas, a la altura del arranque
  ctx.beginGroup('naveRoof');
  for (const [xa, xb] of [
    [-11, -5.95],
    [5.95, 11],
  ]) {
    wb.box('planks', xa, YV, -104, xb, YV + 0.1, -64, { faces: 'b', ao: false, room, tint: [0.7, 0.6, 0.5], uv: 0.7, sub: 2 });
    ctx.col.add(xa, YV, -104, xb, YV + 0.4, -64).cam = true;
    for (let z = -102.4; z < -64.5; z += bw / 2) wb.box('timber', xa, YV - 0.34, z - 0.14, xb, YV, z + 0.14, { ao: false, room, faces: 'nsewb', tint: [0.8, 0.7, 0.6] });
    const xw = xa < 0 ? xa : xb - 0.3;
    wb.box('timber', xw, YV - 0.4, -104, xw + 0.3, YV, -64, { ao: false, room, faces: xa < 0 ? 'ewb' : 'ewb', tint: [0.75, 0.66, 0.56] });
  }
  // coronas de velas en la nave y lámparas en las laterales: la luz llega a
  // la bóveda y a los techos
  for (const z of [-71.5, -82.5, -93.5]) P.candleCrown(ctx, 0, 8.6, z, YV + RV - 0.1, { room, r: 1.3, n: 12, radius: 12, intensity: 1.15 });
  for (const x of [-8.5, 8.5]) for (const z of [-70, -86, -100]) P.hangingLamp(ctx, x, YV - 0.34, z, { room, len: 2.4, radius: 8, intensity: 0.9 });
  ctx.endGroup();
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

  // bancos (algunos volcados) con fieles muertos arrodillados
  const rng = new RNG(1212);
  for (let z = -68; z >= -83; z -= 1.7) {
    for (const x of [-3.0, 3.0]) {
      const off = rng.chance(0.2) ? rng.range(-0.25, 0.25) : 0;
      P.pew(ctx, x, FY, z, 3.4, off);
      if (rng.chance(0.28)) bakeCorpse(wb, x + rng.range(-1, 1), FY + 0.02, z + 0.45, Math.PI, 'kneel', 'villager', rng.int(0, 5));
    }
  }
  P.pew(ctx, -8.4, FY, -74, 3, Math.PI / 2 + 0.3);
  P.pew(ctx, 8.4, FY, -90, 3, -Math.PI / 2 - 0.2);
  // presbiterio: altar, cruz invadida por la carne, candelabros
  P.altarTable(ctx, 0, 1.2, -102.4, 0, 3);
  wb.box('wooddark', -0.18, 1.2, -103.8, 0.18, 8.2, -103.5, { ao: false });
  wb.box('wooddark', -2.2, 6.2, -103.8, 2.2, 6.6, -103.5, { ao: false });
  P.fleshGrowth(ctx, 0, 5.5, -103.4, 1.3, 1301, { room, climb: 1.2, lift: 2, bound: [-4, 4, -103.8, -102.8] });
  P.candles(ctx, -1, 2.22, -102.4, 5, 1302, { room, radius: 5, intensity: 1.2, spread: 0.3 });
  P.candles(ctx, 1, 2.22, -102.4, 5, 1303, { room, radius: 5, intensity: 1.2, spread: 0.3 });
  P.candelabra(ctx, -4.2, 1.2, -101.5, { room });
  P.candelabra(ctx, 4.2, 1.2, -101.5, { room });
  P.candelabra(ctx, -8.8, FY, -66, { room });
  P.candelabra(ctx, 8.8, FY, -94, { room });
  P.veiledStatue(ctx, -7.2, 1.2, -103, 0.4, { ped: 1.0 });
  P.veiledStatue(ctx, 7.2, 1.2, -103, -0.4, { ped: 1.0 });
  P.veiledStatue(ctx, -10.3, FY, -84, Math.PI / 2, { ped: 1.0, veil: 'burlap' });
  P.veiledStatue(ctx, 10.3, FY, -70, -Math.PI / 2, { ped: 1.0 });
  P.candles(ctx, -9.4, FY, -92, 8, 1304, { room, radius: 5, intensity: 0.9, spread: 0.5 });
  P.candles(ctx, 9.5, FY, -76, 8, 1305, { room, radius: 5, intensity: 0.9, spread: 0.5 });
  P.candles(ctx, -3.2, FY, -87, 5, 1306, { room, radius: 4, intensity: 0.8, spread: 0.3 });
  // la corrupción brota de la cripta
  P.fleshGrowth(ctx, -2.8, FY, -92, 1.1, 1307, { room, climb: 1.4 });
  P.fleshGrowth(ctx, 2.9, FY, -95, 1.2, 1308, { room, climb: 1.4 });
  P.fleshGrowth(ctx, -5.5, FY + 0.4, -95, 1.0, 1309, { room, climb: 2.2, lift: 1.5 });
  P.fleshGrowth(ctx, 5.5, FY + 0.4, -89, 0.9, 1310, { room, climb: 2.4, lift: 1.5 });
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
  ctx.beginGroup('naveRoof');
  P.banner(ctx, -4.96, 12.1, -78.1, Math.PI / 2, 'bannerBlack', 1.4, 3.6);
  P.banner(ctx, 4.96, 12.1, -78.1, -Math.PI / 2, 'bannerBlack', 1.4, 3.6);
  // el estandarte grande, colgado del fajón del presbiterio con dos cadenas
  P.banner(ctx, 0, 12.4, -99.8, 0, 'bannerBlack', 2.4, 5.2);
  wb.box('wooddark', -1.4, 12.38, -99.85, 1.4, 12.48, -99.75, { ao: false, room });
  for (const x of [-1.1, 1.1]) P.chains(ctx, x, 16.2, -99.8, Math.round((16.2 - 12.48) / 0.06));
  ctx.endGroup();
  // --- las ruinas: ocultas hasta que Deo Ignoto revienta la nave (el tejado,
  // las bóvedas y lo alto de los muros desaparecen y queda esto)
  ctx.beginGroup('naveRuin');
  {
    const rr = new RNG(4141);
    const RT = [0.78, 0.74, 0.7];
    // lo alto de los muros, roto en dientes
    const jag = (x0, z0, x1, z1, axis) => {
      const L = axis === 'z' ? z1 - z0 : x1 - x0;
      let a = 0;
      while (a < L - 0.01) {
        const w = Math.min(L - a, rr.range(0.7, 2.2));
        const h = rr.range(0.2, 2.3) * (rr.chance(0.2) ? 0.3 : 1);
        if (axis === 'z') wb.box('ashlar', x0, CUT, z0 + a, x1, CUT + h, z0 + a + w, { ao: false, sub: 1.5, tint: RT });
        else wb.box('ashlar', x0 + a, CUT, z0, x0 + a + w, CUT + h, z1, { ao: false, sub: 1.5, tint: RT });
        a += w;
      }
    };
    jag(-13, -104, -11, -64, 'z');
    jag(11, -104, 13, -81, 'z');
    jag(11, -79, 13, -64, 'z');
    jag(11, -81, 13, -79, 'z');
    jag(-13, -108, 13, -104, 'x');
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
      P.rubble(ctx, x, FY, z, n, seed, sp, { scale: 1.6, mat: 'ashlar', collide: true, h: 1.0, room });
    // trozos de la bóveda caídos sobre los bancos
    for (const [x, z, ry, rx, w, d] of [
      [-4.2, -73, 0.4, 0.25, 3.0, 2.2],
      [4.4, -91.5, -0.6, -0.3, 2.6, 2.0],
      [-6.5, -100.5, 1.1, 0.2, 2.4, 1.8],
      [6.6, -82, 0.2, -0.22, 2.6, 1.6],
    ]) {
      wb.push();
      wb.translate(x, FY + 0.45, z);
      wb.rotateY(ry);
      wb.rotateX(rx);
      wb.box('ashlar', -w / 2, -0.35, -d / 2, w / 2, 0.35, d / 2, { ao: false, sub: 1.2, tint: [0.86, 0.83, 0.78], room });
      wb.pop();
      ctx.col.add(x - w * 0.42, FY, z - d * 0.42, x + w * 0.42, FY + 1.0, z + d * 0.42);
    }
    // vigas del tejado caídas
    P.beam(ctx, -9.5, -66, -3, -71, FY + 0.15, 0.16);
    P.beam(ctx, 9.6, -94, 3.5, -99.5, FY + 0.15, 0.15);
    P.beam(ctx, -10, -84, -5.6, -78, FY + 0.15, 0.14);
  }
  ctx.endGroup();
  // candelabros volcados y cera por el suelo de la nave
  P.candles(ctx, 8.6, FY, -70.5, 5, 1312, { room, unlit: true, spread: 0.5 });
  P.candles(ctx, -8.9, FY, -96.8, 4, 1313, { room, unlit: true, spread: 0.4 });
  P.chains(ctx, -10.9, 5.2, -88, 12, 0);
  P.chains(ctx, 10.9, 5.6, -74, 10, 0);
  wb.setRoom(null);
  ctx.rats.push({ x: -10.0, y: FY, z: -102.6, n: 2 });

  L.interact.push(
    { kind: 'door', id: 'd_se', x: 0, y: FY, z: -60.75, w: 3.2, h: 2.38, axis: 'x', lock: { type: 'barred', side: -1 }, mat: 'planks', hinge: 0, swing: -1, double: true, plane: -60.05 },
    { kind: 'door', id: 'd_claustro_se', x: 12, y: FY, z: -80, w: 2, h: 2.55, axis: 'z', lock: { type: 'none' }, mat: 'planks', hinge: -1, swing: -1, plane: 11.05 },
    { kind: 'door', id: 'd_cripta', x: 0, y: FY, z: -86.1, w: 4, h: 3.2, axis: 'x', lock: { type: 'grate', item: 'manivela' }, mat: 'grate', ix: 3.5, iz: -84.9 }
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
  const cryptFloor = (x0, z0, x1, z1, y, mat = 'flag') => {
    wb.box(mat, x0, y - 0.3, z0, x1, y, z1, { faces: 't', ao: false, sub: 2.5, room, uv: mat === 'mosaic' ? 0.2 : 0.5 });
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
    wallFace('mossstone', x0 - 0.5, Y, z0, x0, YS, z1, 'e');
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
    P.sarcophagus(ctx, -5.6, Y, -101.5, Math.PI / 2, { effigy: true, room });
    P.sarcophagus(ctx, -5.6, Y, -106, Math.PI / 2, { open: true, room });
    P.candleAltar(ctx, 5.8, Y, -103.5, -Math.PI / 2, room);
    P.candles(ctx, -6.2, Y, -98, 6, 1501, { room, radius: 4, intensity: 0.9 });
    P.candles(ctx, 6.2, Y, -109, 6, 1502, { room, radius: 4, intensity: 0.9 });
    P.bones(ctx, -5.8, Y, -108.8, 8, 1503, 0.6);
    ctx.rats.push({ x: -5.4, y: Y, z: -109.2, n: 2 });
    for (const z of [-100.6, -106.4]) P.hangingLamp(ctx, 0, YS + 1.35, z, { room, len: 1.7, radius: 8.5, intensity: 1.0 });
    P.wallTorch(ctx, x0, Y + 2.7, -103.75, 'e', { room, radius: 7 });
    P.wallTorch(ctx, x1, Y + 2.7, -99.4, 'w', { room, radius: 7 });
    P.wallTorch(ctx, x1, Y + 2.7, -107.6, 'w', { room, radius: 7 });
    if (ctx.shafts) ctx.shafts.push({ a: [0, Y + 3.8, -97.3], b: [0.4, Y, -100.8], w: 2.0, color: 0xffb070 });
    L.interact.push({ kind: 'altar', id: 'a_cripta', name: 'Altar de la Cripta', x: 5.8, y: Y, z: -103.5, spawn: [4.2, Y, -103.5], yaw: -Math.PI / 2 });
  }

  // --- el osario: un pasillo de calaveras bajo una bóveda también de huesos,
  // con fajones sobre pilastras, nichos de verdad (con su hondura y los huesos
  // dentro: antes, un rectángulo negro pintado en el muro) y las dos bocas de
  // los lados, al sepulcro y al templo
  const OS = { x0: -2.5, x1: 2.5, z0: -136, z1: -110.5, YS: Y + 2.5, RISE: 1.3 };
  {
    const { x0, x1, z0, z1, YS, RISE } = OS;
    const ST = [0.85, 0.82, 0.78];
    C.paint(-2.5, -136, 2.5, -110, 1);
    cryptFloor(-2.5, -136, 2.5, -110, Y);
    const NZ = [-113, -117, -125, -129, -133];
    const PZ = -120;
    const sp = SIDE_PORTAL;
    for (const side of [-1, 1]) {
      const xf = side < 0 ? x0 : x1; // la cara del muro
      const xo = xf + side * 0.5; // el trasdós (pegado al muro de la sala de al lado)
      const xa = Math.min(xf, xo),
        xb = Math.max(xf, xo);
      const f = side < 0 ? 'e' : 'w';
      const seg = (za, zb, ya, yb, extra = '') => {
        if (zb - za < 0.001 || yb - ya < 0.001) return;
        wb.box('skulls', xa, ya, za, xb, yb, zb, { faces: f + extra, sub: 1.6, aoH: 1.2, aoMin: 0.55, baseY: Y, room, tint: ST });
      };
      const holes = [...NZ.map((z) => ({ a0: z - 0.6, a1: z + 0.6, niche: true })), { a0: PZ - sp.w / 2 - sp.ring, a1: PZ + sp.w / 2 + sp.ring }].sort((p, q) => p.a0 - q.a0);
      let cur = z0;
      for (const h of holes) {
        seg(cur, h.a0, Y, YS);
        if (h.niche) {
          // el nicho: hueco en el muro con su fondo, su repisa y su dintel
          const zc = (h.a0 + h.a1) / 2;
          seg(h.a0, h.a1, Y, Y + 1.0);
          seg(h.a0, h.a1, Y + 2.0, YS);
          const NT = [0.42, 0.4, 0.38];
          // (el fondo, un dedo por delante del muro de la sala de al lado: con
          // la cara en el mismo plano parpadeaban)
          const xk = xo - side * 0.03;
          wb.box('mossstone', side < 0 ? xk - 0.05 : xk, Y + 1.0, h.a0, side < 0 ? xk : xk + 0.05, Y + 2.0, h.a1, { faces: f, ao: false, room, tint: NT });
          wb.box('ashlar', xa, Y + 0.94, h.a0, xb, Y + 1.0, h.a1, { faces: 't', ao: false, room, tint: AT });
          wb.box('mossstone', xa, Y + 2.0, h.a0, xb, Y + 2.06, h.a1, { faces: 'b', ao: false, room, tint: NT });
          wb.box('mossstone', xa, Y + 1.0, h.a0, xb, Y + 2.0, h.a0 + 0.001, { faces: 's', ao: false, room, tint: NT });
          wb.box('mossstone', xa, Y + 1.0, h.a1 - 0.001, xb, Y + 2.0, h.a1, { faces: 'n', ao: false, room, tint: NT });
          const xn = (xf + xo) / 2;
          P.bones(ctx, xn, Y + 1.0, zc, 4, Math.round(-zc * 7 + side * 3), 0.25);
          P.skullRow(ctx, xo - side * 0.14, Y + 1.0, zc, side < 0 ? Math.PI / 2 : -Math.PI / 2, 3, { room, gap: 0.3 });
        } else {
          // la boca: jambas (con su cara de dentro) y el arco con sus enjutas
          seg(h.a0, h.a0 + sp.ring, Y, Y + sp.h, 's');
          seg(h.a1 - sp.ring, h.a1, Y, Y + sp.h, 'n');
          archRing(ctx, { axis: 'z', c: PZ, w: sp.w, y0: Y + sp.h, rise: sp.rise, ring: sp.ring, t0: xa, t1: xb, top: YS, clip: [h.a0, h.a1], mat: 'ashlar', spMat: 'skulls', room, tint: AT, spTint: ST });
        }
        cur = h.a1;
      }
      seg(cur, z1, Y, YS);
    }
    // la bóveda de huesos y los fajones sobre sus pilastras
    barrelVault(ctx, { x0, z0, x1, z1, axis: 'z', ys: YS, rise: RISE, mat: 'skulls', tint: [0.74, 0.71, 0.67], room, sub: 1.0, impostTint: AT });
    for (const z of [-115, -123, -131]) {
      archRing(ctx, { axis: 'x', c: 0, w: 4.64, y0: YS, rise: RISE - 0.28, ring: 0.28, t0: z - 0.2, t1: z + 0.2, mat: 'ashlar', room, tint: AT, cam: false });
      pilaster(ctx, x0, z, 'e', Y, YS, { room, tint: AT, w: 0.4, d: 0.18 });
      pilaster(ctx, x1, z, 'w', Y, YS, { room, tint: AT, w: 0.4, d: 0.18 });
    }
    // el testero del norte, con la puerta del sello
    wallFace('skulls', x0, Y, z0 - 0.5, -1.5, YS, z0, 's', { tint: ST });
    wallFace('skulls', 1.5, Y, z0 - 0.5, x1, YS, z0, 's', { tint: ST });
    lunette(ctx, { axis: 'z', at: z0, c: 0, span: x1 - x0, ys: YS, rise: RISE, face: 1, mat: 'skulls', tint: ST, room, hole: { u0: -1.5, u1: 1.5, y: Y + 3.2 } });
    ceilCol(x0, z0, x1, z1, YS + RISE);
    // velas por el suelo, cadenas colgando de la clave y dos lámparas
    for (let z = -113; z > -134; z -= 4) {
      if (Math.abs(z + 120) < 2) continue;
      P.candles(ctx, z % 8 === 0 ? -2.0 : 2.0, Y, z + 2, 3, Math.round(-z * 3), { room, radius: 3.5, intensity: 0.7, spread: 0.15 });
    }
    for (let z = -115; z > -134; z -= 5) for (let k = 0; k < 8; k++) wb.box('iron', -0.03, YS + RISE - k * 0.14, z - 0.03, 0.03, YS + RISE - 0.1 - k * 0.14, z + 0.03, { ao: false, room });
    for (const z of [-112.6, -127.6]) P.hangingLamp(ctx, 0, YS + RISE, z, { room, len: 0.8, radius: 6.5, intensity: 0.95 });
    P.fleshGrowth(ctx, -1.9, Y, -131, 0.8, 1504, { room, climb: 1.6, tendrils: 2, bound: [-2.4, -1.2, -135.8, -126] });
    ctx.rats.push({ x: 1.4, y: Y, z: -113.5, n: 2 });
  }

  // --- el sepulcro del arzobispo (al este): bóveda rebajada con dos fajones
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
    wallFace('mossstone', x1, Y, z0, x1 + 0.5, YS, z1, 'w');
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
    wb.box('ashlar', 8, Y, -122.5, 12, Y + 0.3, -117.5, { faces: 'tnsew', ao: false, room });
    P.sarcophagus(ctx, 10, Y + 0.3, -120, 0, { open: true, room });
    bakeCorpse(wb, 10, Y + 0.72, -120, Math.PI / 2, 'back', 'villager', 1);
    P.candelabra(ctx, 7, Y, -115, { room });
    P.candelabra(ctx, 13, Y, -125, { room });
    P.candles(ctx, 15.2, Y, -113, 7, 1505, { room, radius: 4, intensity: 0.8 });
    P.banner(ctx, 15.9, Y + 3.4, -120, -Math.PI / 2, 'bannerRed', 1.6, 2.7);
    P.sarcophagus(ctx, 5, Y, -126.4, 0, { effigy: true, room });
    P.sarcophagus(ctx, 14.6, Y, -116, Math.PI / 2, { room });
    P.fleshGrowth(ctx, 15.4, Y, -127.4, 1.0, 1506, { room, climb: 1.8 });
    ctx.rats.push({ x: 14.9, y: Y, z: -125.8, n: 1 });
    P.hangingLamp(ctx, c, YS + RISE, -120, { room, len: 1.9, radius: 9.5, intensity: 1.0 });
    for (const z of [-114.6, -125.4]) {
      P.wallTorch(ctx, x1, Y + 2.6, z, 'w', { room, radius: 7 });
      P.wallTorch(ctx, x0, Y + 2.6, z, 'e', { room, radius: 7 });
    }
    L.interact.push(
      { kind: 'item', id: 'i_anillo', item: 'anillo', x: 10.1, y: Y + 1.2, z: -119.6 },
      // (en el estrado, a los pies del sepulcro: a Y + 1,3 flotaba en el aire)
      { kind: 'note', id: 'n_arzobispo', note: 'arzobispo', x: 9.2, y: Y + 0.31, z: -121.2, model: 'paper' }
    );
  }

  // --- el templo romano (al oeste): columnas con su arquitrabe (caído donde
  // se partió la columna) y un techo de casetones; muros de sillería con
  // pilastras y la misma cornisa todo alrededor
  {
    const x0 = -19,
      x1 = -3.5,
      z0 = -132,
      z1 = -112;
    const YE = Y + 4.6, // capiteles
      YA = YE + 0.6, // sobre el arquitrabe
      YT = YA + 0.45; // el techo
    const RT = [0.64, 0.62, 0.58];
    const sp = SIDE_PORTAL;
    C.paint(-3.6, -121, -2.4, -119, 1);
    C.paint(x0, z0, x1, z1, 1);
    cryptFloor(-3.5, -121, -2.5, -119, Y);
    cryptFloor(x0, z0, x1, z1, Y, 'mosaic');
    archedWall(ctx, { axis: 'z', a0: z0, a1: z1, t0: x1, t1: -3.0, y0: Y, y1: YT, openings: [{ c: -120, w: sp.w, h: sp.h, rise: sp.rise, ring: sp.ring, tint: AT }], rooms: [room, room], mat: 'ashlar', tint: RT, collide: false });
    wallFace('ashlar', x0 - 0.5, Y, z0, x0, YT, z1, 'e', { tint: RT });
    wallFace('ashlar', x0, Y, z0 - 0.5, x1, YT, z0, 's', { tint: RT });
    wallFace('ashlar', x0, Y, z1, x1, YT, z1 + 0.5, 'n', { tint: RT });
    // la cornisa (a la altura del arquitrabe) y las pilastras
    const cor = { ao: false, room, tint: AT, sub: 2 };
    wb.box('ashlar', x0, YE, z0, x0 + 0.14, YA, z1, { ...cor, faces: 'eb' });
    wb.box('ashlar', x1 - 0.14, YE, z0, x1, YA, z1, { ...cor, faces: 'wb' });
    wb.box('ashlar', x0 + 0.14, YE, z0, x1 - 0.14, YA, z0 + 0.14, { ...cor, faces: 'sb' });
    wb.box('ashlar', x0 + 0.14, YE, z1 - 0.14, x1 - 0.14, YA, z1, { ...cor, faces: 'nb' });
    for (const z of [-116, -123, -129]) {
      pilaster(ctx, x0, z, 'e', Y, YE, { room, tint: AT, w: 0.6, d: 0.12 });
      pilaster(ctx, x1, z, 'w', Y, YE, { room, tint: AT, w: 0.6, d: 0.12 });
    }
    // columnas (dos partidas) y el arquitrabe sobre ellas
    const cols = [
      [-15, -116, 0],
      [-8, -116, 1],
      [-15, -123, 0],
      [-8, -123, 0],
      [-15, -129, 1],
      [-8, -129, 0],
    ];
    for (const [x, z, broken] of cols) {
      if (broken) {
        P.column(ctx, x, Y, z, 2.2, 0.45, { mat: 'ashlar' });
        P.rubble(ctx, x + 1.2, Y, z + 0.5, 4, Math.round(x * z), 1, { mat: 'ashlar', scale: 1.2 });
      } else P.column(ctx, x, Y, z, YE - Y, 0.45, { mat: 'ashlar' });
    }
    const arch = (x, za, zb) => wb.box('ashlar', x - 0.42, YE, za, x + 0.42, YA, zb, { ao: false, room, tint: AT, faces: 'nsewb', sub: 2 });
    // hilera de x = -15: entera hasta la columna de -123; de ahí al muro del
    // norte se vino abajo (la columna de -129 está partida): quedan los muñones
    // (de cornisa a cornisa: metido en ella, sus caras de abajo coincidían)
    arch(-15, -116, z1 - 0.14);
    arch(-15, -123, -116);
    arch(-15, -124.6, -123);
    arch(-15, z0 + 0.14, -130.6);
    // hilera de x = -8: caída entre el muro del sur y la columna de -123
    arch(-8, -113.4, z1 - 0.14);
    arch(-8, -123, -121.6);
    arch(-8, -129, -123);
    arch(-8, z0 + 0.14, -129);
    // los trozos de arquitrabe por el suelo
    // (lejos del paso de la puerta y del corro del ritual)
    for (const [x, z, ry, rz, len] of [
      [-15.4, -126.4, 0.25, 0.1, 2.2],
      [-16.4, -127.4, 0.4, -0.06, 1.5],
      [-8.5, -117.4, 0.12, 0.08, 2.2],
      [-9.8, -114.5, -0.6, -0.1, 1.6],
    ]) {
      wb.push();
      wb.translate(x, Y, z);
      wb.rotateY(ry);
      wb.rotateZ(rz);
      wb.box('ashlar', -0.42, 0, -len / 2, 0.42, 0.6, len / 2, { ao: false, room, tint: AT, faces: 'tnsew', sub: 2 });
      wb.pop();
      ctx.col.addOBB(x, z, 0.42, len / 2, ry, Y, Y + 0.6);
    }
    // el techo de casetones: vigas a lo largo y a lo ancho y el fondo pintado
    const CB = [0.8, 0.76, 0.7];
    wb.box('ashlar', x0, YT, z0, x1, YT + 0.2, z1, { faces: 'b', ao: false, room, tint: [0.56, 0.4, 0.33], sub: 1.2 });
    for (let z = z1 - 1.25; z > z0; z -= 2.5) wb.box('ashlar', x0, YA, z - 0.16, x1, YT, z + 0.16, { faces: 'nsb', ao: false, room, tint: CB, sub: 2 });
    for (const x of [-17.2, -11.5, -5.3]) wb.box('ashlar', x - 0.14, YA + 0.12, z0, x + 0.14, YT, z1, { faces: 'ewb', ao: false, room, tint: CB, sub: 2 });
    ceilCol(x0, z0, x1, z1, YT);
    wb.box('water', -18.8, Y + 0.08, -120.5, -12, Y + 0.1, -112.2, { faces: 't', ao: false, grime: false, room });
    // altar DEO IGNOTO
    wb.box('ashlar', -13, Y, -131.8, -9, Y + 1.3, -130, { faces: 'tnsew', sub: 2, room });
    wb.box('ashlar', -13.3, Y + 1.3, -132, -8.7, Y + 1.5, -129.8, { ao: false, room });
    ctx.col.add(-13.3, Y, -132, -8.7, Y + 1.5, -129.8);
    P.veiledStatue(ctx, -17.5, Y, -131, 0.3, { ped: 1.0, veil: 'burlap' });
    P.veiledStatue(ctx, -4.8, Y, -131, -0.3, { ped: 1.0, veil: 'burlap' });
    P.candles(ctx, -11, Y + 1.5, -130.8, 7, 1507, { room, radius: 6, intensity: 1.3, spread: 1.2 });
    P.fleshGrowth(ctx, -11, Y + 1.5, -131.7, 1.1, 1508, { room, climb: 2.5, lift: 1.5, bound: [-14, -8, -131.9, -129] });
    P.bones(ctx, -6, Y, -114, 10, 1509, 1.2);
    P.ritual(ctx, -11, Y, -125.5, 1.6, 1510, { room });
    ctx.rats.push({ x: -5.4, y: Y, z: -113.2, n: 2 });
    for (const z of [-118.4, -126.4]) P.wallTorch(ctx, x0, Y + 2.6, z, 'e', { room, radius: 7.5 });
    for (const z of [-114.4, -126.4]) P.wallTorch(ctx, x1, Y + 2.6, z, 'w', { room, radius: 7.5 });
    P.brazier(ctx, -14.6, Y, -130.2, {});
    P.brazier(ctx, -7.4, Y, -130.2, {});
    L.interact.push(
      { kind: 'note', id: 'n_romana', note: 'romana', x: -11, y: Y + 1.0, z: -129.8, model: 'wall', r: 1.8 },
      { kind: 'item', id: 'i_relicario2', item: 'relicario', x: -12.3, y: Y + 1.7, z: -130.6 }
    );
  }

  // --- la puerta del jefe: el sello en su marco de sillería, al fondo del osario
  C.paint(-1.5, -137.2, 1.5, -135.8, 1);
  cryptFloor(-1.5, -137, 1.5, -136, Y);
  for (const s of [-1, 1]) wb.box('ashlar', s * 1.5, Y, -136.45, s * 2.0, Y + 3.2, -135.8, { ao: false, room, tint: AT });
  wb.box('ashlar', -1.9, Y + 3.2, -136.45, 1.9, Y + 3.48, -135.8, { ao: false, room, tint: AT });
  L.interact.push(
    { kind: 'door', id: 'd_sello', x: 0, y: Y, z: -136.2, w: 3, h: 3.2, axis: 'x', lock: { type: 'seal', item: 'anillo' }, mat: 'seal' },
    { kind: 'fog', id: 'f_boss', boss: 'turibulario', x: 0, y: Y, z: -136.8, w: 3, h: 3.2, axis: 'x', enter: -1 }
  );

  // --- la cisterna (arena del jefe final): un corro de ocho columnas con sus
  // arcos y, encima, una cúpula con nervios de la que cuelga una corona de
  // velas; alrededor, un techo llano que asienta en los muros y en los arcos
  const AY = -10;
  {
    const cz = -152,
      RR = 11.2;
    const YC = AY + 6.0, // capiteles
      YT = AY + 8.8; // arranque de la cúpula y techo de alrededor
    C.paint(-15, -167, 15, -137, 1);
    // (la puerta del norte, a la altura de la bóveda de la galería)
    interiorRoom(ctx, -15, -167, 15, -137, AY, 8.8, { wall: 'mossstone', t: 0.6, room, floor: false, ceil: false, beams: false, skirting: false, tint: [0.7, 0.7, 0.68], doors: [{ side: 's', at: 0, w: 3, h: 6.2 }, { side: 'n', at: 0, w: 4, h: 4.0 }] });
    // (el jefe final: cuando el arzobispo se transforma, el centro del suelo
    // se hunde en un pozo, el corro de columnas cae y la cúpula revienta; ver
    // finale/film_rise.js. Lo que se rompe va en grupos: 'cisternFloorC', el
    // cuadro del suelo que se hunde; 'cisternPit', el pozo; 'cisternCols' y
    // 'cisternColsRuin', las columnas enteras y sus muñones; 'cisternDome' y
    // 'cisternDomeRuin', la cúpula entera y lo que queda de ella)
    // el techo: un anillo fijo y, en medio, lo que revienta con la cúpula
    for (const [a, b, c, d] of [
      [-15, -167, 15, -159],
      [-15, -145, 15, -137],
      [-15, -159, -7, -145],
      [7, -159, 15, -145],
    ])
      ctx.col.add(a, YT, b, c, YT + 0.6, d).cam = true;
    ctx.beginGroup('cisternDome');
    ctx.col.add(-7, YT, -159, 7, YT + 0.6, -145).cam = true;
    ctx.endGroup();
    // el suelo: un marco fijo y, en medio, el cuadro que se hunde
    const PC = 8;
    for (const [a, b, c, d] of [
      [-15, -167, 15, cz - PC],
      [-15, cz + PC, 15, -137],
      [-15, cz - PC, -PC, cz + PC],
      [PC, cz - PC, 15, cz + PC],
    ])
      cryptFloor(a, b, c, d, AY, 'flag');
    const bloodBox = (a, b, c, d) => wb.box('blood', a, AY + 0.02, b, c, AY + 0.04, d, { faces: 't', ao: false, grime: false, room, uv: 0.2 });
    bloodBox(-12, -164, 12, cz - PC);
    bloodBox(-12, cz + PC, 12, -142);
    bloodBox(-12, cz - PC, -PC, cz + PC);
    bloodBox(PC, cz - PC, 12, cz + PC);
    ctx.beginGroup('cisternFloorC');
    cryptFloor(-PC, cz - PC, PC, cz + PC, AY, 'flag');
    bloodBox(-PC, cz - PC, PC, cz + PC);
    ctx.endGroup();
    cisternPit(ctx, cz, PC, AY, room, VT, AT);
    stairs(ctx, 0, AY, -141.5, 's', 3, 10, 0.3, 0.45, 'mossstone', { solidBelow: true });
    for (const s of [-1, 1]) {
      solid(ctx, 'mossstone', s * 1.5, AY, -141.5, s * 2.1, Y + 0.9, -137, { sub: 2, room });
      wb.box('ashlar', s * 1.45, Y + 0.9, -141.55, s * 2.15, Y + 1.02, -137, { ao: false, room, tint: AT, faces: 'tnsewb' });
    }
    // el corro de columnas, sus arcos (girados sobre cada lado del octógono)
    // y los macizos sobre los capiteles
    const cols = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      cols.push([Math.cos(a) * RR, cz + Math.sin(a) * RR, a]);
    }
    ctx.beginGroup('cisternCols');
    for (const [x, z] of cols) P.column(ctx, x, AY, z, YC - AY, 0.7, { mat: 'ashlar' });
    for (let i = 0; i < 8; i++) {
      const [xa, za] = cols[i],
        [xb, zb] = cols[(i + 1) % 8];
      const len = Math.hypot(xb - xa, zb - za);
      wb.push();
      wb.translate((xa + xb) / 2, 0, (za + zb) / 2);
      wb.rotateY(Math.atan2(-(zb - za), xb - xa));
      archRing(ctx, { axis: 'x', c: 0, w: len - 1.6, y0: YC, rise: 2.0, ring: 0.4, t0: -0.35, t1: 0.35, top: YT, clip: [-len / 2, len / 2], mat: 'ashlar', spMat: 'mossstone', room, tint: AT, spTint: CT, cam: false });
      wb.pop();
    }
    for (const [x, z, a] of cols) {
      wb.push();
      wb.translate(x, 0, z);
      wb.rotateY(-a);
      wb.box('mossstone', -0.35, YC, -0.55, 0.35, YT, 0.55, { faces: 'nsew', room, tint: CT, sub: 1.6 });
      wb.pop();
    }
    ctx.endGroup();
    // el techo llano de alrededor (del cuadrado de los muros al círculo de la
    // cúpula) y la cúpula; lo de dentro del corro revienta con ella
    const rd = 9.9,
      rm = 12.8,
      N = 32;
    const sq = (t) => {
      const c = Math.cos(t),
        s = Math.sin(t);
      const m = 15 / Math.max(Math.abs(c), Math.abs(s));
      return V3(c * m, YT, cz + s * m);
    };
    const ring = (t, r) => V3(Math.cos(t) * r, YT, cz + Math.sin(t) * r);
    for (let k = 0; k < N; k++) {
      const t0 = (k / N) * Math.PI * 2,
        t1 = ((k + 1) / N) * Math.PI * 2;
      wb.quad('mossstone', ring(t0, rm), sq(t0), sq(t1), ring(t1, rm), { ao: false, sub: 2.5, tint: VT, room });
    }
    const DR = 5.2;
    ctx.beginGroup('cisternDome');
    for (let k = 0; k < N; k++) {
      const t0 = (k / N) * Math.PI * 2,
        t1 = ((k + 1) / N) * Math.PI * 2;
      wb.quad('mossstone', ring(t0, rd), ring(t0, rm), ring(t1, rm), ring(t1, rd), { ao: false, sub: 2.5, tint: VT, room });
    }
    dome(ctx, { cx: 0, cz, r: rd, y0: YT, rise: DR, n: N, m: 10, mat: 'mossstone', tint: VT, room, ribs: 8, ribPhase: Math.PI / 8, ribMat: 'ashlar', ribTint: AT, ribW: 0.4, ribD: 0.24 });
    ctx.endGroup();
    cisternRuins(ctx, { cz, rd, rm, YT, YC, AY, cols, room, VT, AT, CT });
    // la corona de hierro con sus velas, colgada de la clave (se viene abajo
    // en el rito: grupo 'cisternCrown'; ver finale/rite.js)
    ctx.beginGroup('cisternCrown');
    P.candleCrown(ctx, 0, AY + 6.8, cz, YT + DR - 0.35, { room, r: 1.4, n: 12, radius: 13, intensity: 1.0 });
    ctx.endGroup();
    // el altar del Dios Desconocido, ante la masa de carne del norte: aquí
    // reza el arzobispo
    wb.box('ashlar', -1.35, AY, -162.1, 1.35, AY + 1.05, -160.7, { room, tint: AT, sub: 1.2 });
    wb.box('blood', -1.2, AY + 1.05, -161.95, 1.2, AY + 1.07, -160.85, { faces: 't', ao: false, grime: false, room, uv: 0.3 });
    ctx.col.add(-1.35, AY, -162.1, 1.35, AY + 1.05, -160.7);
    P.candles(ctx, 0, AY + 1.05, -161.4, 5, 1630, { room, radius: 3, intensity: 0.6, spread: 0.45 });
    // lo que deja el rito (grupo 'riteRubble', oculto hasta entonces): el
    // agujero de la clave por donde se lo llevó la carne del dios, la corona
    // caída, trozos de los nervios y el montón que ciega la reja del río
    ctx.beginGroup('riteRubble');
    {
      const top = YT + DR;
      wb.cylinder('black', 0, top - 0.32, cz, 1.9, 1.9, 0.08, 14, { ao: false, grime: false, capTop: true, capBot: true, room });
      const rr = new RNG(1650);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + rr.range(-0.1, 0.1);
        const r = 1.9 + rr.range(-0.15, 0.35);
        const l = rr.range(0.35, 0.8);
        wb.push();
        wb.translate(Math.cos(a) * r, top - 0.45 - l * 0.4, cz + Math.sin(a) * r);
        wb.rotateY(-a);
        wb.rotateZ(rr.range(-0.4, 0.4));
        wb.box('mossstone', -0.18, -l / 2, -0.22, 0.18, l / 2, 0.22, { ao: false, room, tint: VT });
        wb.pop();
      }
      // la corona, ladeada en el suelo
      wb.geometry('iron', new THREE.TorusGeometry(1.4, 0.05, 4, 24), new THREE.Matrix4().compose(V(1.2, AY + 0.45, cz + 1.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.42, 0.3, 0.1)), V(1, 1, 1)), { ao: false, room });
      wb.geometry('iron', new THREE.TorusGeometry(0.77, 0.035, 4, 16), new THREE.Matrix4().compose(V(1.25, AY + 0.42, cz + 1.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.42, 0.3, 0.1)), V(1, 1, 1)), { ao: false, room });
      // trozos de los nervios y dovelas de la cúpula
      for (let k = 0; k < 9; k++) {
        const a = rr.range(0, Math.PI * 2),
          d = rr.range(0.5, 4.5);
        const x = Math.cos(a) * d,
          z = cz + Math.sin(a) * d;
        const L = rr.range(0.6, 1.7);
        wb.push();
        wb.translate(x, AY + 0.2, z);
        wb.rotateY(rr.range(0, Math.PI));
        wb.rotateZ(rr.range(-0.25, 0.25));
        wb.box(k % 3 ? 'mossstone' : 'ashlar', -L / 2, -0.2, -0.22, L / 2, 0.2, 0.22, { ao: false, room, tint: k % 3 ? VT : AT });
        wb.pop();
      }
      P.rubble(ctx, -0.8, AY, cz - 0.6, 12, 1651, 2.2, { scale: 1.1, mat: 'mossstone', room });
    }
    ctx.endGroup();
    // el montón que ciega la reja del río (no se llega a ella) hasta que Deo
    // Ignoto, al morir, la revienta (grupo 'riteGrate')
    ctx.beginGroup('riteGrate');
    {
      P.rubble(ctx, 0, AY, -165.0, 20, 1652, 2.4, { scale: 1.9, mat: 'mossstone', blocks: 0.8, room });
      P.rubble(ctx, -2.6, AY + 1.2, -166.0, 8, 1653, 1.2, { scale: 1.5, mat: 'mossstone', room });
      P.rubble(ctx, 2.4, AY + 1.0, -166.1, 8, 1654, 1.2, { scale: 1.5, mat: 'mossstone', room });
      for (const [x, z, sx, sy, sz, ry] of [
        [-1.2, -164.4, 1.6, 1.0, 1.1, 0.3],
        [1.4, -164.9, 1.4, 1.2, 1.0, -0.5],
        [0.2, -166.2, 2.2, 1.4, 1.2, 0.1],
      ]) {
        wb.push();
        wb.translate(x, AY + sy / 2 - 0.05, z);
        wb.rotateY(ry);
        wb.rotateX(0.12);
        wb.box('mossstone', -sx / 2, -sy / 2, -sz / 2, sx / 2, sy / 2, sz / 2, { ao: false, room, tint: VT, sub: 1.2 });
        wb.pop();
      }
      ctx.col.add(-3.4, AY, -167.2, 3.4, AY + 3.2, -163.4);
    }
    ctx.endGroup();
    // la masa de carne del norte que rodea la salida
    P.fleshGrowth(ctx, -6, AY, -166, 2.4, 1601, { room, climb: 2.8, lift: 3, bound: [-15, 15, -166.8, -160] });
    P.fleshGrowth(ctx, 6, AY, -166, 2.4, 1602, { room, climb: 2.8, lift: 3, bound: [-15, 15, -166.8, -160] });
    P.fleshGrowth(ctx, 0, AY + 4.6, -166.2, 1.8, 1603, { room, climb: 1.5, lift: 2, bound: [-8, 8, -166.8, -164] });
    P.fleshGrowth(ctx, -14, AY, -150, 1.4, 1604, { room, climb: 2.5 });
    P.fleshGrowth(ctx, 14, AY, -145, 1.3, 1605, { room, climb: 2.5 });
    for (let i = 0; i < 10; i++) P.bones(ctx, -12 + i * 2.6, AY + 0.04, -140 - (i % 3) * 8, 6, 1610 + i, 1.3);
    P.candles(ctx, -13.5, AY, -139, 8, 1620, { room, radius: 5, intensity: 1.1 });
    P.candles(ctx, 13.5, AY, -139, 8, 1621, { room, radius: 5, intensity: 1.1 });
    P.candles(ctx, -13.5, AY, -165, 8, 1622, { room, radius: 5, intensity: 1.0 });
    P.candles(ctx, 13.5, AY, -165, 8, 1623, { room, radius: 5, intensity: 1.0 });
    for (const z of [-145, -159]) {
      P.wallTorch(ctx, -15, AY + 3.4, z, 'e', { room, radius: 8 });
      P.wallTorch(ctx, 15, AY + 3.4, z, 'w', { room, radius: 8 });
    }
    for (const x of [-7.5, 7.5]) {
      P.wallTorch(ctx, x, AY + 3.4, -167, 's', { room, radius: 8 });
      P.wallTorch(ctx, x, AY + 3.4, -137, 'n', { room, radius: 8 });
    }
    ctx.lights.push({ x: 0, y: AY + 3, z: cz, r: 0.8, g: 0.2, b: 0.12, radius: 16, intensity: 0.6, room });
    L.interact.push({ kind: 'door', id: 'd_salida', x: 0, y: AY, z: -167.2, w: 4, h: 4.2, axis: 'x', lock: { type: 'boss', boss: 'turibulario' }, mat: 'grate' });
    L.enemies.push({ type: 'turibulario', x: 0, y: AY, z: -155, yaw: 0, idle: 'boss', id: 'b_turibulario', boss: true });
  }

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

  // --- la galería de salida al río: sube hacia el norte bajo una bóveda en
  // rampa, entre dos tramos llanos (antes, un techo escalonado con rendijas)
  {
    const tr = 'tunnel';
    const zS = -170,
      zE = -170 - 34 * 0.45, // fin de la escalera
      zW = -194; // la cara de dentro del muro del río
    const spr = 2.0;
    const yG = (z) => (z > zS ? AY : z < zE ? 0 : AY + ((zS - z) / (zS - zE)) * 10);
    const TT = [0.66, 0.68, 0.64];
    C.paint(-2, -196, 2, -167, 1);
    W(S, -2, -196, 2, -167);
    cryptFloor(-2, -170, 2, -167, AY);
    stairs(ctx, 0, AY, zS, 'n', 4, 34, 10 / 34, 0.45, 'mossstone', { solidBelow: true });
    // tramo llano final (antes sin suelo visible)
    wb.box('mossstone', -2, -0.3, -196.4, 2, 0, zE, { faces: 't', ao: false, room: tr, sub: 2 });
    for (const x of [-2.6, 2]) ctx.col.add(x, AY, -196, x + 0.6, 3.8, -167);
    // muros hasta el arranque de la bóveda, y las jambas en el muro del río
    for (const [x, f] of [
      [-2, 1],
      [2, -1],
    ])
      for (const [za, zb] of [
        [zS, -167],
        [zE, zS],
        [zW, zE],
      ])
        slopeWall('mossstone', x, f, za, zb, AY - 0.5, yG(za) + spr, yG(zb) + spr, { room: tr, tint: TT });
    wallFace('mossstone', -2.6, 0, -196.4, -2, spr, zW, 'e', { room: tr, tint: TT });
    wallFace('mossstone', 2, 0, -196.4, 2.6, spr, zW, 'w', { room: tr, tint: TT });
    barrelVault(ctx, { x0: -2, x1: 2, z0: zS, z1: -167, axis: 'z', ys: AY + spr, mat: 'mossstone', tint: VT, room: tr, sub: 1.0, impostTint: AT });
    rampVault(ctx, { x0: -2, x1: 2, z0: zE, z1: zS, ys0: spr, ys1: AY + spr, mat: 'mossstone', tint: VT, room: tr, impostTint: AT });
    barrelVault(ctx, { x0: -2, x1: 2, z0: zW, z1: zE, axis: 'z', ys: spr, mat: 'mossstone', tint: VT, room: tr, sub: 1.0, impostTint: AT });
    ctx.col.addCam(-2, AY + spr + 2, zS, 2, AY + spr + 2.6, -167);
    ctx.col.addCam(-2, spr + 2, zW, 2, spr + 2.6, zE);
    for (const [z, s] of [
      [-174.5, -1],
      [-180.5, 1],
      [-186.5, -1],
      [-191.5, 1],
    ])
      P.wallTorch(ctx, s * 2, yG(z) + 1.55, z, s < 0 ? 'e' : 'w', { room: tr, radius: 6.5, dyn: 2 });
  }
  wb.setRoom(null);

  L.phantoms.push({ x: 0, y: Y, z: -133, trigger: [0, Y, -113], kind: 'mourner' });
  L.zones.push(
    { id: 'arena', rects: [[-15, -167, 15, -137, -11, -1]], atmo: 'arena', room: 'crypt' },
    { id: 'tomb', rects: [[3.5, -128, 16, -112, -8, -1]], atmo: 'crypt', room: 'crypt' },
    { id: 'roman', rects: [[-19, -132, -3.5, -112, -8, -1]], atmo: 'crypt', room: 'crypt' },
    { id: 'ossuary', rects: [[-2.5, -136, 2.5, -110, -8, -2]], atmo: 'crypt', room: 'crypt' },
    { id: 'crypt', rects: [[-7, -110, 7, -97, -8, -1.5], [-2, -97, 2, -86, -8, -1.3]], atmo: 'crypt', room: 'crypt' },
    { id: 'tunnel', rects: [[-2, -196, 2, -167, -11, 4]], atmo: 'tunnel', room: 'tunnel' }
  );
  L.map.push(
    { id: 'crypt', r: [-7, -110, 7, -97], level: 'crypt' },
    { id: 'crypt', r: [-2, -97, 2, -86], level: 'crypt' },
    { id: 'ossuary', r: [-2.5, -136, 2.5, -110], level: 'crypt' },
    { id: 'tomb', r: [3.5, -128, 16, -112], level: 'crypt' },
    { id: 'roman', r: [-19, -132, -3.5, -112], level: 'crypt' },
    { id: 'arena', r: [-15, -167, 15, -137], level: 'crypt' },
    { id: 'tunnel', r: [-2, -196, 2, -167], level: 'crypt' }
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
  // talud hasta las murallas
  // (sube desde la orilla y vuelve a bajar hasta el pie de la muralla: desde
  // el adarve se ve la ladera, no una explanada a la altura de las almenas.
  // Mirando hacia arriba: antes miraba hacia abajo y, desde lo alto, no se
  // dibujaba; se veían la galería y la cúpula de la cisterna)
  wb.quad('dirt', new THREE.Vector3(-70, 5, -194.5), new THREE.Vector3(-70, 7.5, -152), new THREE.Vector3(70, 7.5, -152), new THREE.Vector3(70, 5, -194.5), { sub: 8, ao: false, tint: [0.6, 0.66, 0.5] });
  wb.quad('dirt', new THREE.Vector3(-70, 7.5, -152), new THREE.Vector3(-70, 2.5, -126.1), new THREE.Vector3(70, 2.5, -126.1), new THREE.Vector3(70, 7.5, -152), { sub: 8, ao: false, tint: [0.6, 0.66, 0.5] });
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
    wb.cylinder('bronze', ex, y0 + 5.9, fzE - 0.18, 0.34, 0.16, 0.55, 8, { ao: false, capTop: true });
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
