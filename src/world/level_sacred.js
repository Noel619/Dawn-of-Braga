// Sé de Braga, claustro, cripta (osario, templo romano, sepulcro),
// cisterna del jefe final, galería y orillas del río.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, stairs, merlons, cityWall, tower, archWall, stoneWall } from './builders.js';
import * as P from './props.js';
import { floor, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';

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

// ======================================================================== CATEDRAL
export function buildCathedral(ctx, S, L) {
  const wb = ctx.wb;
  const room = 'cathedral';
  const FY = 0.6; // altura del suelo interior

  // --- exterior: torres, pórtico (galilé), fachada
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
  // pórtico
  W(S, -5, -60, 5, -55);
  ctx.col.add(-5, 0, -60, 5, FY, -56);
  wb.box('flag', -5, 0, -60, 5, FY, -56, { faces: 't', ao: false, room });
  stairs(ctx, 0, 0, -55.1, 'n', 10, 2, 0.3, 0.45, 'ashlar');
  archWall(ctx, -5, 5, -56.6, -56, 8.5, 0, 6, 6.2, { slices: 10 });
  wb.box('ashlar', -5.2, 8.5, -60, 5.2, 9.2, -56.2, { ao: false, sub: 2 });
  ctx.col.add(-5, 8.5, -60, 5, 9.2, -56);
  wb.box('wooddark', -5, 8.3, -60, 5, 8.5, -56.6, { faces: 'b', ao: false });
  P.wallTorch(ctx, -4.9, 3, -58, 'e');
  P.wallTorch(ctx, 4.9, 3, -58, 'w');
  // fachada con portada
  archWall(ctx, -5, 5, -61.5, -60, 18, 0, 3.2, 4.6, { mat: 'ashlar', slices: 8 });
  wb.box('ashlar', -1.6, 0, -61.5, 1.6, FY, -60, { faces: 't', ao: false });
  ctx.col.add(-1.6, 0, -61.5, 1.6, FY, -60);
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

  // --- muros de la nave
  W(S, -11, -104, 11, -61.5);
  const nave = (x0, z0, x1, z1) => solid(ctx, 'ashlar', x0, 0, z0, x1, 14, z1, { sub: 2.2, aoH: 2 });
  nave(-13, -104, -11, -64);
  nave(11, -104, 13, -81);
  nave(11, -79, 13, -64);
  solid(ctx, 'ashlar', 11, 3.2, -81, 13, 14, -79, { sub: 2, ao: false });
  nave(-13, -108, 13, -104);
  // cabecera poligonal
  solid(ctx, 'ashlar', -7, 0, -112, 7, 12, -108, { sub: 2.2 });
  wb.pyramid('roof', 0, -110, 15, 5, 12, 3);
  wb.gableRoof(-13, -108, 13, -61.5, 14, 20, 'z', { wallMat: 'ashlar', overhang: 0.8 });
  // contrafuertes (lado oeste)
  for (let z = -100; z <= -68; z += 8) solid(ctx, 'ashlar', -14.4, 0, z - 0.6, -13, 11, z + 0.6, { sub: 2 });
  // vidrieras
  for (let z = -98; z <= -70; z += 7) {
    lancet(ctx, -11.02, z, 'x');
    lancet(ctx, -12.98, z, 'x');
    lancet(ctx, 11.02, z, 'x', 7.5, 4.5);
    lancet(ctx, 12.98, z, 'x', 7.5, 4.5);
    ctx.lights.push({ x: -9.5, y: 7.5, z, r: 1.0, g: 0.16, b: 0.1, radius: 10, intensity: 0.7, room });
    ctx.lights.push({ x: 9.5, y: 8.5, z, r: 0.9, g: 0.2, b: 0.2, radius: 10, intensity: 0.5, room });
  }
  lancet(ctx, 0, -103.98, 'z', 5, 7, 2.2);
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
  // techo artesonado
  wb.box('wooddark', -11, 14, -104, 11, 14.3, -61.5, { faces: 'b', ao: false, room, tint: [0.5, 0.45, 0.42] });
  for (let z = -103; z < -62; z += 2.2) wb.box('timber', -11, 13.6, z - 0.15, 11, 14, z + 0.15, { ao: false, room });
  ctx.col.add(-11, 14, -104, 11, 14.5, -61.5).cam = true;
  // arquerías de la nave (dos filas)
  const bays = 6;
  const za = -95,
    zb = -66;
  const bw = (zb - za) / bays;
  for (const x of [-5.5, 5.5]) {
    for (let i = 0; i < bays; i++) {
      const a0 = za + i * bw;
      archWall(ctx, a0, a0 + bw, x - 0.45, x + 0.45, 11, a0 + bw / 2, bw - 1.2, 7.6, { axis: 'z', mat: 'ashlar', slices: 8, vmat: 'ashlar' });
    }
    solid(ctx, 'ashlar', x - 0.6, 0, za - 0.6, x + 0.6, 11, za + 0.6, { sub: 2 });
    solid(ctx, 'ashlar', x - 0.6, 0, zb - 0.6, x + 0.6, 11, zb + 0.6, { sub: 2 });
  }
  // barandilla alrededor de la escalera de la cripta
  solid(ctx, 'ashlar', -2.4, FY, -97.4, -2, FY + 0.95, -86, { sub: 2 });
  solid(ctx, 'ashlar', 2, FY, -97.4, 2.4, FY + 0.95, -86, { sub: 2 });
  solid(ctx, 'ashlar', -2.4, FY, -97.4, 2.4, FY + 0.95, -97, { sub: 2 });
  for (const x of [-2.2, 2.2]) wb.box('ashlar', x - 0.25, FY, -86.5, x + 0.25, FY + 1.4, -86, { ao: false });
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
    for (const x of [-2.6, 2.6]) {
      const off = rng.chance(0.2) ? rng.range(-0.5, 0.5) : 0;
      P.pew(ctx, x, FY, z, 3.8, off);
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
  P.banner(ctx, -5.5, 12.5, -80, Math.PI / 2, 'bannerBlack', 1.4, 3.8);
  P.banner(ctx, 5.5, 12.5, -80, -Math.PI / 2, 'bannerBlack', 1.4, 3.8);
  P.banner(ctx, 0, 13, -100, 0, 'bannerBlack', 2.4, 5.5);
  wb.setRoom(null);

  L.interact.push(
    { kind: 'door', id: 'd_se', x: 0, y: FY, z: -60.75, w: 3.2, h: 4.4, axis: 'x', lock: { type: 'barred', side: -1 }, mat: 'planks', hinge: 0, swing: -1, double: true },
    { kind: 'door', id: 'd_claustro_se', x: 12, y: 0.3, z: -80, w: 2, h: 3.1, axis: 'z', lock: { type: 'none' }, mat: 'planks', hinge: -1, swing: -1 },
    { kind: 'door', id: 'd_cripta', x: 0, y: FY, z: -86.1, w: 4, h: 3.2, axis: 'x', lock: { type: 'grate', item: 'manivela' }, mat: 'grate', ix: 3.5, iz: -84.9 }
  );
  // escalón de la puerta lateral
  W(S, 11, -81, 13.2, -79);
  wb.box('ashlar', 11, 0, -81, 13, 0.3, -79, { faces: 'tnsew', ao: false });
  ctx.col.add(11, 0, -81, 13, 0.3, -79);

  L.enemies.push(
    { type: 'bell', x: 0, y: FY, z: -74, yaw: Math.PI, idle: 'wander', id: 'e_se1' },
    { type: 'penitent', x: -2.6, y: FY, z: -71.2, yaw: Math.PI, idle: 'pray', id: 'e_se2' },
    { type: 'penitent', x: 2.6, y: FY, z: -79.7, yaw: Math.PI, idle: 'pray', id: 'e_se3' },
    { type: 'mourner', x: 0, y: 1.2, z: -99.5, yaw: 0, idle: 'stand', id: 'e_se4' }
  );
  L.zones.push({ id: 'cathedral', rects: [[-13, -108, 13, -61.5, -0.5, 16]], atmo: 'cathedral' });
  L.map.push({ id: 'cathedral', r: [-11, -104, 11, -61.5] }, { id: 'largo', r: [-5, -61.5, 5, -55] });
}

// ======================================================================== CLAUSTRO
export function buildCloister(ctx, S, L) {
  const wb = ctx.wb;
  W(S, 13, -88, 36, -60.5);
  W(S, 15.5, -60.6, 19, -56);
  // muros exteriores
  solid(ctx, 'wallstone', 13, 0, -60.5, 15.5, 7, -59.5, { sub: 2 });
  solid(ctx, 'wallstone', 19, 0, -60.5, 37, 7, -59.5, { sub: 2 });
  solid(ctx, 'wallstone', 15.5, 3.6, -60.5, 19, 7, -59.5, { sub: 2, ao: false });
  solid(ctx, 'wallstone', 36, 0, -89, 37, 7, -60.5, { sub: 2 });
  solid(ctx, 'wallstone', 13, 0, -89, 37, 7, -88, { sub: 2 });
  floor(ctx, 13, -88, 36, -60.5, 'flag');
  floor(ctx, 19.4, -81.6, 29.6, -66.4, 'dirt', 0.02);
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
  par(gx0, gz0, gx0 + 0.4, -75);
  par(gx0, -73, gx0 + 0.4, gz1);
  par(gx1 - 0.4, gz0, gx1, -75);
  par(gx1 - 0.4, -73, gx1, gz1);
  for (let x = gx0; x <= gx1 + 0.01; x += 2.2) {
    for (const z of [gz0 + 0.2, gz1 - 0.2]) {
      if (Math.abs(x - 24.5) < 1.2) continue;
      wb.cylinder('ashlar', x, 0.9, z, 0.17, 0.15, 3.3, 6, { ao: false });
      wb.box('ashlar', x - 0.28, 4.1, z - 0.28, x + 0.28, 4.4, z + 0.28, { ao: false });
    }
  }
  for (let z = gz0; z <= gz1 + 0.01; z += 2.0) {
    for (const x of [gx0 + 0.2, gx1 - 0.2]) {
      if (Math.abs(z + 74) < 1.2) continue;
      wb.cylinder('ashlar', x, 0.9, z, 0.17, 0.15, 3.3, 6, { ao: false });
      wb.box('ashlar', x - 0.28, 4.1, z - 0.28, x + 0.28, 4.4, z + 0.28, { ao: false });
    }
  }
  // vigas y tejados en pendiente de las galerías
  wb.box('ashlar', gx0, 4.4, gz0 - 0.1, gx1, 4.8, gz0 + 0.5, { ao: false });
  wb.box('ashlar', gx0, 4.4, gz1 - 0.5, gx1, 4.8, gz1 + 0.1, { ao: false });
  wb.box('ashlar', gx0 - 0.1, 4.4, gz0, gx0 + 0.5, 4.8, gz1, { ao: false });
  wb.box('ashlar', gx1 - 0.5, 4.4, gz0, gx1 + 0.1, 4.8, gz1, { ao: false });
  // sur
  wb.quad('roof', V(36, 6.6, -60.5), V(13, 6.6, -60.5), V(13, 4.8, -66.2), V(36, 4.8, -66.2), { ao: false, sub: 2.4 });
  wb.quad('wooddark', V(13, 6.4, -60.5), V(36, 6.4, -60.5), V(36, 4.6, -66.2), V(13, 4.6, -66.2), { ao: false, sub: 3, tint: [0.45, 0.42, 0.4] });
  // norte
  wb.quad('roof', V(13, 6.6, -88), V(36, 6.6, -88), V(36, 4.8, -81.8), V(13, 4.8, -81.8), { ao: false, sub: 2.4 });
  wb.quad('wooddark', V(36, 6.4, -88), V(13, 6.4, -88), V(13, 4.6, -81.8), V(36, 4.6, -81.8), { ao: false, sub: 3, tint: [0.45, 0.42, 0.4] });
  // oeste (apoyado en la catedral)
  wb.quad('roof', V(13, 6.6, -66.2), V(13, 6.6, -81.8), V(19.2, 4.8, -81.8), V(19.2, 4.8, -66.2), { ao: false, sub: 2.4 });
  wb.quad('wooddark', V(13, 6.4, -81.8), V(13, 6.4, -66.2), V(19.2, 4.6, -66.2), V(19.2, 4.6, -81.8), { ao: false, sub: 3, tint: [0.45, 0.42, 0.4] });
  // este
  wb.quad('roof', V(36, 6.6, -81.8), V(36, 6.6, -66.2), V(29.8, 4.8, -66.2), V(29.8, 4.8, -81.8), { ao: false, sub: 2.4 });
  wb.quad('wooddark', V(36, 6.4, -66.2), V(36, 6.4, -81.8), V(29.8, 4.6, -81.8), V(29.8, 4.6, -66.2), { ao: false, sub: 3, tint: [0.45, 0.42, 0.4] });
  ctx.col.add(13, 4.6, -88, 36, 6.8, -81.8).cam = true;
  ctx.col.add(13, 4.6, -66.2, 36, 6.8, -60.5).cam = true;
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
  L.interact.push(
    { kind: 'door', id: 'd_claustro', x: 17.25, y: 0, z: -60, w: 3.5, h: 3.6, axis: 'x', lock: { type: 'key', item: 'llave_claustro' }, mat: 'irongate', hinge: 0, swing: -1, double: true },
    { kind: 'item', id: 'i_relicario1', item: 'relicario', x: 27.9, y: 0.25, z: -68.3 },
    { kind: 'note', id: 'n_claustro', note: 'claustro', x: 21, y: 0.9, z: -78.4, model: 'stone', r: 1.6 }
  );
  L.enemies.push(
    { type: 'penitent', x: 21, y: 0, z: -71, yaw: 0, idle: 'kneel', id: 'e_cl1' },
    { type: 'penitent', x: 27.6, y: 0, z: -80, yaw: 0, idle: 'kneel', id: 'e_cl2' },
    { type: 'hound', x: 33, y: 0, z: -79, yaw: 1.5, idle: 'eat', id: 'e_cl3' },
    { type: 'crawler', x: 26, y: 0, z: -85.5, yaw: 0, idle: 'stand', id: 'e_cl4' }
  );
  L.zones.push({ id: 'cloister', rects: [[13, -88, 36, -60.5, -1, 8], [15.5, -60.6, 19, -59.4, -1, 8]], atmo: 'city' });
  L.map.push({ id: 'cloister', r: [13, -88, 36, -60.5] });
}

// ======================================================================== CRIPTA
export function buildCrypt(ctx, S, C, L) {
  const wb = ctx.wb;
  const Y = -7;
  const room = 'crypt';
  wb.setRoom(room);
  // escalera desde la catedral (baja hacia el norte)
  W(S, -2, -97, 2, -86);
  C.paint(-2, -97.2, 2, -85.8, 1);
  stairs(ctx, 0, Y, -97, 's', 4, 25, 0.304, 0.44, 'wallstone');
  for (const x of [-2.4, 2]) wb.box('wallstone', x, Y, -97, x + 0.4, 0.6, -86, { sub: 2, room, faces: x < 0 ? 'e' : 'w', aoH: 2 });
  wb.box('wallstone', -2.4, Y + 4.8, -97.4, 2.4, 0.6, -97, { sub: 2, room, faces: 's' });
  ctx.col.add(-2.6, Y, -97.2, -2, 0.6, -86);
  ctx.col.add(2, Y, -97.2, 2.6, 0.6, -86);

  const cryptFloor = (x0, z0, x1, z1, y, mat = 'flag') => {
    wb.box(mat, x0, y - 0.3, z0, x1, y, z1, { faces: 't', ao: false, sub: 2.5, room, uv: mat === 'mosaic' ? 0.2 : 0.5 });
    ctx.col.add(x0, y - 1, z0, x1, y, z1);
  };
  const croom = (x0, z0, x1, z1, y0, h, wall, doors, o = {}) => {
    C.paint(x0, z0, x1, z1, 1);
    interiorRoom(ctx, x0, z0, x1, z1, y0, h, {
      wall,
      t: 0.5,
      room,
      doors,
      floor: false,
      ceilMat: o.ceil ?? 'mossstone',
      beams: false,
      skirting: false,
      tint: o.tint ?? [0.75, 0.75, 0.72],
      skip: o.skip,
    });
    ctx.col.add(x0, y0 + h, z0, x1, y0 + h + 0.4, z1).cam = true;
  };

  // --- sala de llegada
  croom(-7, -110, 7, -97, Y, 4.8, 'mossstone', [
    { side: 's', at: 0, w: 4, h: 4.8 },
    { side: 'n', at: 0, w: 5, h: 3.8 },
  ]);
  cryptFloor(-7, -110, 7, -97, Y);
  for (const [x, z] of [
    [-4, -100],
    [4, -100],
    [-4, -107],
    [4, -107],
  ])
    P.column(ctx, x, Y, z, 4.8, 0.4, { mat: 'mossstone' });
  P.sarcophagus(ctx, -5.6, Y, -101.5, Math.PI / 2, { effigy: true });
  P.sarcophagus(ctx, -5.6, Y, -106, Math.PI / 2, { open: true });
  P.candleAltar(ctx, 5.8, Y, -103.5, -Math.PI / 2, room);
  P.candles(ctx, -6.2, Y, -98, 6, 1501, { room, radius: 4, intensity: 0.9 });
  P.candles(ctx, 6.2, Y, -109, 6, 1502, { room, radius: 4, intensity: 0.9 });
  P.bones(ctx, -5.8, Y, -108.8, 8, 1503, 0.6);
  L.interact.push({ kind: 'altar', id: 'a_cripta', name: 'Altar de la Cripta', x: 5.8, y: Y, z: -103.5, spawn: [4.2, Y, -103.5], yaw: -Math.PI / 2 });

  // --- osario (pasillo de calaveras)
  croom(-2.5, -136, 2.5, -110, Y, 3.8, 'skulls', [
    { side: 's', at: 0, w: 5, h: 3.8 },
    { side: 'n', at: 0, w: 3, h: 3.2 },
    { side: 'e', at: -120, w: 2, h: 2.8 },
    { side: 'w', at: -120, w: 2, h: 2.8 },
  ], { tint: [0.85, 0.82, 0.78] });
  cryptFloor(-2.5, -136, 2.5, -110, Y);
  for (let z = -113; z > -134; z -= 4) {
    if (Math.abs(z + 120) < 2) continue;
    for (const x of [-2.52, 2.02]) {
      wb.box('black', x, Y + 1.0, z - 0.6, x + 0.5, Y + 2.0, z + 0.6, { faces: x < 0 ? 'e' : 'w', ao: false, grime: false, room });
      P.bones(ctx, x < 0 ? -2.3 : 2.3, Y + 1.0, z, 3, Math.round(z * 7), 0.3);
    }
    P.candles(ctx, z % 8 === 0 ? -2.1 : 2.1, Y, z + 2, 3, Math.round(-z * 3), { room, radius: 3.5, intensity: 0.7, spread: 0.15 });
  }
  // cadenas colgando
  for (let z = -115; z > -134; z -= 5) for (let k = 0; k < 8; k++) wb.box('iron', -0.03, Y + 3.8 - k * 0.14, z - 0.03, 0.03, Y + 3.7 - k * 0.14, z + 0.03, { ao: false, room });
  P.fleshGrowth(ctx, -1.9, Y, -131, 0.8, 1504, { room, climb: 1.6, tendrils: 2, bound: [-2.4, -1.2, -135.8, -126] });

  // --- sepulcro del arzobispo (este)
  C.paint(2.4, -121, 3.6, -119, 1);
  croom(3.5, -128, 16, -112, Y, 5, 'mossstone', [{ side: 'w', at: -120, w: 2, h: 2.8 }]);
  cryptFloor(2.5, -121, 3.5, -119, Y);
  cryptFloor(3.5, -128, 16, -112, Y);
  wb.box('ashlar', 8, Y, -122.5, 12, Y + 0.3, -117.5, { faces: 'tnsew', ao: false, room });
  P.sarcophagus(ctx, 10, Y + 0.3, -120, 0, { open: true });
  bakeCorpse(wb, 10, Y + 0.72, -120, Math.PI / 2, 'back', 'villager', 1);
  P.candelabra(ctx, 7, Y, -115, { room });
  P.candelabra(ctx, 13, Y, -125, { room });
  P.candles(ctx, 15.2, Y, -113, 7, 1505, { room, radius: 4, intensity: 0.8 });
  P.banner(ctx, 15.9, Y + 4.2, -120, -Math.PI / 2, 'bannerRed', 1.6, 3.2);
  P.sarcophagus(ctx, 5, Y, -126.4, 0, { effigy: true });
  P.sarcophagus(ctx, 14.6, Y, -116, Math.PI / 2, {});
  P.fleshGrowth(ctx, 15.4, Y, -127.4, 1.0, 1506, { room, climb: 1.8 });
  L.interact.push(
    { kind: 'item', id: 'i_anillo', item: 'anillo', x: 10.1, y: Y + 1.2, z: -119.6 },
    { kind: 'note', id: 'n_arzobispo', note: 'arzobispo', x: 9.2, y: Y + 1.3, z: -121.2, model: 'paper' }
  );

  // --- templo romano (oeste)
  C.paint(-3.6, -121, -2.4, -119, 1);
  croom(-19, -132, -3.5, -112, Y, 5.5, 'ashlar', [{ side: 'e', at: -120, w: 2, h: 2.8 }], { tint: [0.6, 0.58, 0.55] });
  cryptFloor(-3.5, -121, -2.5, -119, Y);
  cryptFloor(-19, -132, -3.5, -112, Y, 'mosaic');
  wb.box('water', -18.8, Y + 0.08, -120.5, -12, Y + 0.1, -112.2, { faces: 't', ao: false, grime: false, room });
  for (const [x, z, broken] of [
    [-15, -116, 0],
    [-8, -116, 1],
    [-15, -123, 0],
    [-8, -123, 0],
    [-15, -129, 1],
    [-8, -129, 0],
  ]) {
    if (broken) {
      P.column(ctx, x, Y, z, 2.2, 0.45, { mat: 'ashlar' });
      P.rubble(ctx, x + 1.2, Y, z + 0.5, 4, Math.round(x * z), 1, { mat: 'ashlar', scale: 1.2 });
    } else P.column(ctx, x, Y, z, 5.5, 0.45, { mat: 'ashlar' });
  }
  // altar DEO IGNOTO
  wb.box('ashlar', -13, Y, -131.8, -9, Y + 1.3, -130, { faces: 'tnsew', sub: 2, room });
  wb.box('ashlar', -13.3, Y + 1.3, -132, -8.7, Y + 1.5, -129.8, { ao: false, room });
  ctx.col.add(-13.3, Y, -132, -8.7, Y + 1.5, -129.8);
  P.veiledStatue(ctx, -17.5, Y, -131, 0.3, { ped: 1.0, veil: 'burlap' });
  P.veiledStatue(ctx, -4.8, Y, -131, -0.3, { ped: 1.0, veil: 'burlap' });
  P.candles(ctx, -11, Y + 1.5, -130.8, 7, 1507, { room, radius: 6, intensity: 1.3, spread: 1.2 });
  P.fleshGrowth(ctx, -11, Y + 1.5, -131.7, 1.1, 1508, { room, climb: 2.5, lift: 1.5, bound: [-14, -8, -131.9, -129] });
  P.bones(ctx, -6, Y, -114, 10, 1509, 1.2);
  L.interact.push(
    { kind: 'note', id: 'n_romana', note: 'romana', x: -11, y: Y + 1.0, z: -129.8, model: 'wall', r: 1.8 },
    { kind: 'item', id: 'i_relicario2', item: 'relicario', x: -12.3, y: Y + 1.7, z: -130.6 }
  );

  // --- puerta del jefe (sello + niebla)
  C.paint(-1.5, -137.2, 1.5, -135.8, 1);
  cryptFloor(-1.5, -137, 1.5, -136, Y);
  wb.box('ashlar', -2.5, Y, -136.4, -1.5, Y + 3.2, -135.9, { ao: false, room });
  wb.box('ashlar', 1.5, Y, -136.4, 2.5, Y + 3.2, -135.9, { ao: false, room });
  L.interact.push(
    { kind: 'door', id: 'd_sello', x: 0, y: Y, z: -136.2, w: 3, h: 3.2, axis: 'x', lock: { type: 'seal', item: 'anillo' }, mat: 'seal' },
    { kind: 'fog', id: 'f_boss', boss: 'turibulario', x: 0, y: Y, z: -136.8, w: 3, h: 3.2, axis: 'x', enter: -1 }
  );

  // --- cisterna (arena del jefe final)
  const AY = -10;
  C.paint(-15, -167, 15, -137, 1);
  interiorRoom(ctx, -15, -167, 15, -137, AY, 8.8, { wall: 'mossstone', t: 0.6, room, floor: false, ceilMat: 'mossstone', beams: false, skirting: false, tint: [0.7, 0.7, 0.68], doors: [{ side: 's', at: 0, w: 3, h: 6.2 }, { side: 'n', at: 0, w: 4, h: 4.2 }] });
  ctx.col.add(-15, AY + 8.8, -167, 15, AY + 9.4, -137).cam = true;
  cryptFloor(-15, -167, 15, -137, AY, 'flag');
  wb.box('blood', -12, AY + 0.02, -164, 12, AY + 0.04, -142, { faces: 't', ao: false, grime: false, room, uv: 0.2 });
  stairs(ctx, 0, AY, -141.5, 's', 3, 10, 0.3, 0.45, 'mossstone');
  for (const x of [-1.5, 1.5]) solid(ctx, 'mossstone', x < 0 ? -2.1 : 1.5, AY, -141.5, x < 0 ? -1.5 : 2.1, Y + 0.9, -137, { sub: 2, room });
  // anillo de columnas
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 11.2,
      z = -152 + Math.sin(a) * 11.2;
    P.column(ctx, x, AY, z, 8.8, 0.7, { mat: 'ashlar' });
  }
  // la gran masa de carne del norte que rodea la salida
  P.fleshGrowth(ctx, -6, AY, -166, 2.4, 1601, { room, climb: 2.8, lift: 3, bound: [-15, 15, -166.8, -160] });
  P.fleshGrowth(ctx, 6, AY, -166, 2.4, 1602, { room, climb: 2.8, lift: 3, bound: [-15, 15, -166.8, -160] });
  P.fleshGrowth(ctx, 0, AY + 4.8, -166.2, 1.8, 1603, { room, climb: 1.5, lift: 2, bound: [-8, 8, -166.8, -164] });
  P.fleshGrowth(ctx, -14, AY, -150, 1.4, 1604, { room, climb: 2.5 });
  P.fleshGrowth(ctx, 14, AY, -145, 1.3, 1605, { room, climb: 2.5 });
  for (let i = 0; i < 10; i++) P.bones(ctx, -12 + i * 2.6, AY + 0.04, -140 - (i % 3) * 8, 6, 1610 + i, 1.3);
  P.candles(ctx, -13.5, AY, -139, 8, 1620, { room, radius: 5, intensity: 1.1 });
  P.candles(ctx, 13.5, AY, -139, 8, 1621, { room, radius: 5, intensity: 1.1 });
  P.candles(ctx, -13.5, AY, -165, 8, 1622, { room, radius: 5, intensity: 1.0 });
  P.candles(ctx, 13.5, AY, -165, 8, 1623, { room, radius: 5, intensity: 1.0 });
  ctx.lights.push({ x: 0, y: AY + 3, z: -152, r: 0.8, g: 0.2, b: 0.12, radius: 16, intensity: 0.6, room });
  L.interact.push({ kind: 'door', id: 'd_salida', x: 0, y: AY, z: -167.2, w: 4, h: 4.2, axis: 'x', lock: { type: 'boss', boss: 'turibulario' }, mat: 'grate' });
  L.enemies.push({ type: 'turibulario', x: 0, y: AY, z: -155, yaw: 0, idle: 'boss', id: 'b_turibulario', boss: true });

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

  // --- galería de salida al río (sube hacia el norte)
  C.paint(-2, -196, 2, -167, 1);
  W(S, -2, -196, 2, -167);
  cryptFloor(-2, -170, 2, -167, AY);
  stairs(ctx, 0, AY, -170, 'n', 4, 34, 10 / 34, 0.45, 'mossstone', { solidBelow: true });
  for (const x of [-2.6, 2]) {
    wb.box('mossstone', x, AY, -196, x + 0.6, 3.6, -167, { sub: 2, room: 'tunnel', faces: x < 0 ? 'e' : 'w', aoH: 1 });
    ctx.col.add(x, AY, -196, x + 0.6, 3.8, -167);
  }
  for (let z = -167; z > -196; z -= 1.5) {
    const k = Math.min(34, Math.max(0, Math.floor((-170 - z) / 0.45)));
    const fy = z > -170 ? AY : AY + (k * 10) / 34;
    const cy = Math.min(3.2, fy + 3.4);
    wb.box('mossstone', -2, cy, z - 1.5, 2, cy + 0.4, z, { faces: 'b', ao: false, room: 'tunnel' });
    ctx.col.add(-2, cy, z - 1.5, 2, cy + 0.4, z).cam = true;
  }
  for (let z = -175; z > -192; z -= 6) {
    const fy = AY + Math.min(10, ((-170 - z) / 0.45) * (10 / 34));
    P.wallTorch(ctx, -2, fy + 2.2, z, 'e', { room: 'tunnel', radius: 6, dyn: 2 });
  }
  wb.setRoom(null);

  L.zones.push(
    { id: 'arena', rects: [[-15, -167, 15, -137, -11, -1]], atmo: 'arena' },
    { id: 'tomb', rects: [[3.5, -128, 16, -112, -8, -1]], atmo: 'crypt' },
    { id: 'roman', rects: [[-19, -132, -3.5, -112, -8, -1]], atmo: 'crypt' },
    { id: 'ossuary', rects: [[-2.5, -136, 2.5, -110, -8, -2]], atmo: 'crypt' },
    { id: 'crypt', rects: [[-7, -110, 7, -97, -8, -1.5], [-2, -97, 2, -86, -8, -1.3]], atmo: 'crypt' },
    { id: 'tunnel', rects: [[-2, -196, 2, -167, -11, 4]], atmo: 'tunnel' }
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
export function buildRiver(ctx, S, L) {
  const wb = ctx.wb;
  W(S, -30, -216, 30, -196);
  floor(ctx, -40, -240, 40, -196, 'dirt', 0, { tint: [0.8, 0.9, 0.7], sub: 4 });
  wb.box('water', -80, -0.35, -300, 80, -0.3, -214, { faces: 't', ao: false, grime: false, sub: 8 });
  // montículo con la boca de la galería
  wb.box('dirt', -9, 0, -194, 9, 4.2, -178, { faces: 'tnsew', sub: 3, tint: [0.7, 0.8, 0.6] });
  wb.pyramid('dirt', 0, -186, 22, 20, 4.2, 2.5, { tint: [0.7, 0.8, 0.6] });
  for (const x of [-2.6, 2]) wb.box('mossstone', x, 0, -196.4, x + 0.6, 3.6, -194, { sub: 2 });
  wb.box('mossstone', -2.8, 3.2, -196.4, 2.8, 4.2, -194, { sub: 2 });
  ctx.col.add(-9, 0, -194, -2, 5, -178);
  ctx.col.add(2, 0, -194, 9, 5, -178);
  // juncos y rocas en la orilla
  const rng = new RNG(1701);
  for (let i = 0; i < 70; i++) {
    const x = rng.range(-30, 30),
      z = rng.range(-216, -208);
    const h = rng.range(0.6, 1.6);
    wb.push();
    wb.translate(x, -0.3, z);
    wb.rotateZ(rng.range(-0.25, 0.25));
    wb.box('straw', -0.02, 0, -0.02, 0.02, h, 0.02, { ao: false, tint: [0.6, 0.8, 0.5] });
    wb.pop();
  }
  P.rubble(ctx, -14, 0, -210, 7, 1702, 2.4, { mat: 'wallstone', scale: 2 });
  P.rubble(ctx, 17, 0, -205, 6, 1703, 2, { mat: 'wallstone', scale: 2.4 });
  // embarcadero y barca
  for (let z = -206; z > -222; z -= 1.2) wb.box('planks', 6, 0.05, z - 1.1, 8.4, 0.2, z, { faces: 'tnsew', ao: false, uv: 0.7 });
  for (let z = -208; z > -222; z -= 3.6) for (const x of [6.1, 8.3]) wb.box('wooddark', x - 0.1, -1, z - 0.1, x + 0.1, 0.6, z + 0.1, { ao: false });
  wb.push();
  wb.translate(10.4, -0.2, -219);
  wb.rotateY(0.25);
  wb.box('planks', -0.8, 0, -2.4, 0.8, 0.5, 2.4, { faces: 'nsewb', ao: false, uv: 0.8 });
  wb.box('planks', -0.7, 0.1, -2.3, 0.7, 0.15, 2.3, { faces: 't', ao: false, uv: 0.8 });
  wb.pop();
  L.interact.push({ kind: 'trigger', id: 't_final', x: 0, y: 0, z: -209, r: 30, rz: 4, event: 'ending' });
  // muralla norte de la ciudad, visible desde el río
  cityWall(ctx, -93, -126, 76, -122, 10, { merlonSides: ['n'] });
  for (const x of [-60, -30, 25, 55]) tower(ctx, x, -124, 6, 14);
  L.zones.push({ id: 'river', rects: [[-60, -300, 60, -196, -2, 30]], atmo: 'dawn' });
  L.map.push({ id: 'river', r: [-30, -216, 30, -196] });
}
