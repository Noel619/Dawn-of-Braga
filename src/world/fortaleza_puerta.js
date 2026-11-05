// La puerta de la fortaleza y su cuerpo de guardia (PLAN_FORTALEZA.md, §5.2;
// fase 3).
//
// La puerta, entre sus dos torres, en el eje del patio y de la torre: el paso
// abovedado, recto, con sus dos rastrillos (el de fuera, echado; el de
// dentro, alzado) y las buhederas entre ellos y, por fuera, el puente
// levadizo alzado sobre su foso de estacas. Encima del paso, la cámara del
// torno: el torno del puente (suelto el freno, el puente cae: el atajo al
// patio de armas), la palanca del rastrillo y el alcaide, muerto junto al
// torno con sus últimas líneas («He mandado alzar el puente»).
//
// Al lado, el cuerpo de guardia: abajo, la sala, con el libro de la
// guarnición y la escalera; arriba, la armería y el taller del ballestero,
// partidos por un tabique con dos arcos (uno lleno de escombro; el otro,
// tapiado con cal fresca). Un bolaño entró por la muralla y se llevó media
// pared del taller y parte de su suelo. Por fuera, colgado de la torre y de la
// muralla, el cadalso de madera: desde la cámara del torno se sale a él, y en
// su cabo vigila el alférez con la ballesta de la guardia (su llave, la de la
// reja de la Sé). Por el boquete del bolaño se entra del cadalso al taller,
// donde está la ballesta; el tabique se derriba desde dentro.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { blocker, archedWall, barrelVault, beam, stairs, subtractRects } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, talud, esquina, almenas, saetera, matacanes, muroVanos, ajimez, saeteraDentro, forjado, cara1 } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const T = FORT;
const G = T.puerta;
const CAM = G.camara;
const F1 = T.F1;
// lo de debajo de los suelos de la planta alta (la cámara del torno, la
// armería y el taller), y su techo (lo de debajo de la terraza)
const YB = F1 - 0.3;
const YT = T.walk - 0.4;
const PISO = [0.74, 0.71, 0.66];
const pc = (G.px0 + G.px1) / 2,
  pw = G.px1 - G.px0;
const ROOM = { zaguan: 'zaguan', camara: 'camara_torno', guardia: 'guardia', armeria: 'armeria_fortaleza', taller: 'taller_ballestero' };

export function buildPuerta(ctx, S, L) {
  torres(ctx, S, L);
  camaraTorno(ctx, L);
  fosoPuente(ctx, S, L);
  guardia(ctx, S, L);
  plantaAlta(ctx, L);
  cadalso(ctx, L);
}

// ------------------------------------------------------------------------ las torres y el paso
// Las dos torres, macizas hasta el suelo de la cámara del torno, con su talud
// y sus esquinas; el cuerpo de en medio, con el arco de fuera y el del patio
// y la bóveda del paso, con sus buhederas; el rastrillo, que sube por sus
// ranuras a la cámara; los agujeros de las cadenas del puente y el escudo del
// Rey entre los matacanes.
function torres(ctx, S, L) {
  const wb = ctx.wb;
  const Td = T.talud;
  const tint = PIEDRA.lienzo;
  const room = ROOM.zaguan;
  const Pt = T.patio;
  const zf = G.z1; // la cara de fuera
  const zi = G.z0; // la del patio
  for (const [a, b, lado] of [
    [G.x0, G.px0, -1],
    [G.px1, G.x1, 1],
  ]) {
    const fo = lado < 0 ? 'w' : 'e',
      fi = lado < 0 ? 'e' : 'w';
    const xo = lado < 0 ? a : b;
    // (macizas hasta el suelo de la cámara y por encima de lo alto del cuerpo
    // de en medio; entre medias, la colisión es la de los muros de la cámara)
    ctx.col.add(a, 0, zi, b, YB, zf);
    ctx.col.add(a, G.hm, zi, b, G.h, zf);
    // la cara al campo (la de levante, con la puerta del cadalso)
    const ps = T.cadalso.puerta,
      pw2 = 0.55;
    if (lado > 0) {
      for (const [u0, v0, u1, v1] of subtractRects([a, Td.h - 0.05, b, G.h], [[ps - pw2, F1, ps + pw2, F1 + 2.2]])) wb.box('wallstone', u0, v0, zf, u1, v1, zf + 0.01, { faces: 's', sub: 2.2, aoH: 3, tint, baseY: 0 });
    } else wb.box('wallstone', a, Td.h - 0.05, zf, b, G.h, zf + 0.01, { faces: 's', sub: 2.2, aoH: 3, tint, baseY: 0 });
    // (al paso, a la sala del lado —la despensa; el cuerpo de guardia, hasta
    // su techo— y al claustro)
    wb.box('wallstone', a, 0, zi + 0.6, b, G.ys, zf - 0.6, { faces: fi, sub: 1.8, aoH: 1.4, room, tint: [0.7, 0.68, 0.64] });
    wb.box('wallstone', a, 0, Pt.z1 + T.ti, b, lado < 0 ? F1 : YB, T.z1 - T.t, { faces: fo, sub: 2, aoH: 1.5, room: lado < 0 ? 'despensa' : ROOM.guardia, tint: PIEDRA.patio });
    wb.box('wallstone', a, 0, zi, b, T.claustro.yHi, zi + 0.01, { faces: 'n', sub: 2, aoH: 1.5, room: 'claustro', tint: PIEDRA.patio });
    wb.box('wallstone', a, T.claustro.yHi, zi, b, T.walk, zi + 0.01, { faces: 'n', sub: 2.2, tint: PIEDRA.patio });
    // (por encima de las terrazas)
    wb.box('wallstone', a, T.walk, zi, b, G.h, zf, { faces: 'n' + fo + fi, sub: 2.2, tint });
    // (lo que asoma de la muralla: su costado de fuera)
    wb.box('wallstone', a, Td.h - 0.05, T.z1, b, T.walk, zf, { faces: fo, sub: 2.2, tint, aoH: 3 });
    talud(ctx, 's', zf, a, b, Td.h, Td.d, { ext: lado < 0 ? [Td.d, 0] : [0, Td.d], tint, ends: lado < 0 ? [false, true] : [true, false] });
    talud(ctx, fo, xo, T.z1, zf, Td.h, Td.d, { ext: [0, Td.d], tint });
    esquina(ctx, xo, zf, lado, 1, Td.h, G.h - 0.6);
    // matacanes en la cara de fuera y la cornisa con sus almenas
    matacanes(ctx, 's', zf, a + 0.3, b - 0.3, G.h - 2.4);
    wb.box('wallstone', a - 0.3, G.h - 0.5, zi - 0.3, b + 0.3, G.h, zf + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' }, tint });
    for (const [d, line, u0, u1] of [
      ['n', zi - 0.3, a - 0.3, b + 0.3],
      [fo, lado < 0 ? a - 0.3 : b + 0.3, zi, zf],
    ])
      almenas(ctx, d, line, u0, u1, G.h, { vuelo: 0, collide: false });
    blocker(ctx, a, G.h, zi, b, G.h + 2, zf);
    // saeteras (la de abajo de la torre de levante, no: ahí está el cadalso)
    if (lado < 0) saetera(ctx, 's', zf, (a + b) / 2, 4.6);
    saetera(ctx, fo, xo, (T.z1 + zf) / 2, lado < 0 ? 4.6 : 9.6, { cruz: false });
    saetera(ctx, 's', zf, (a + b) / 2 - (lado > 0 ? 0.4 : 0), 9.0);
    P.banner(ctx, (a + b) / 2, G.h - 3.2, zf + 0.95, 0, 'bannerRey', 1.4, 3.6);
  }
  // el cuerpo de en medio, sobre el paso: del arco de fuera al del patio
  const ys = G.ys,
    rise = G.rise;
  archedWall(ctx, { axis: 'x', a0: G.px0, a1: G.px1, t0: zf - 0.6, t1: zf + 0.03, y0: 0, y1: G.hm, openings: [{ c: pc, w: pw, h: ys, rise, ring: 0.42, tint: PIEDRA.silla }], mat: 'wallstone', tint, rooms: [room, null], sub: 2 });
  // (el del patio, más bajo que la bóveda —un arco de embocadura—: su rosca
  // queda bajo las vigas del techo de la galería del claustro, que llevan el
  // suelo del paseo de las cámaras; arrancando con la bóveda, la rosca
  // cortaba esas vigas y asomaba seis centímetros sobre el suelo del paseo)
  const ringP = 0.36,
    ysP = T.claustro.paseo.y - 0.48 - 0.06 - ringP - rise;
  archedWall(ctx, { axis: 'x', a0: G.px0, a1: G.px1, t0: zi - 0.03, t1: zi + 0.6, y0: 0, y1: T.walk, openings: [{ c: pc, w: pw, h: ysP, rise, ring: ringP, tint: PIEDRA.silla }], mat: 'wallstone', tint: PIEDRA.patio, rooms: ['claustro', room], sub: 2 });
  // la bóveda del paso, con las buhederas de la cámara del torno (las bocas
  // negras en la clave)
  barrelVault(ctx, { x0: G.px0, x1: G.px1, z0: zi + 0.6, z1: zf - 0.6, ys, rise, axis: 'z', room, tint: [0.56, 0.54, 0.5], mat: 'ashlar' });
  for (const z of BUHEDERAS) wb.box('black', pc - 0.3, ys + rise - 0.03, z - 0.3, pc + 0.3, ys + rise - 0.02, z + 0.3, { faces: 'b', ao: false, grime: false, room });
  wb.box('wallstone', G.px0, T.walk, zi, G.px1, G.hm, zi + 0.6, { faces: 'n', sub: 2.2, tint });
  wb.box('flag', G.px0 - 0.3, G.hm - 0.02, zi, G.px1 + 0.3, G.hm, zf, { faces: 't', ao: false });
  almenas(ctx, 's', zf + 0.3, G.px0, G.px1, G.hm, { vuelo: 0, collide: false });
  // el suelo del paso: el enlosado, con el carril del rastrillo
  wb.box('flag', G.px0, -0.05, zi, G.px1, 0.02, zf, { faces: 't', ao: false, room, tint: [0.66, 0.63, 0.58] });
  W(S, G.px0 + 0.1, zi - 0.2, G.px1 - 0.1, zf + 0.3);
  // el rastrillo: la reja corre por las ranuras de las jambas y sube a la
  // cámara del torno; la sube la palanca de arriba
  {
    const zr = G.rastrillo;
    for (const [u, f] of [
      [G.px0, 'e'],
      [G.px1 - 0.012, 'w'],
    ])
      wb.box('black', u, 0, zr - 0.06, u + 0.012, ys + 0.2, zr + 0.06, { faces: f, ao: false, grime: false, room });
    wb.box('black', G.px0 + 0.1, 0.033, zr - 0.06, G.px1 - 0.1, 0.035, zr + 0.06, { faces: 't', ao: false, grime: false, room });
    L.interact.push({ kind: 'door', id: 'd_rastrillo_fort', x: pc, y: 0, z: zr, w: pw, h: ys + rise, lift: ys + rise - 0.4, axis: 'x', lock: { type: 'lever', msg: 'rastrilloFortaleza' }, mat: 'grate', lit: true });
  }
  // el rastrillo de dentro, junto al arco del patio: alzado y metido en su
  // ranura de la bóveda (sólo le asoman las puntas); la ranura baja por las
  // jambas y cruza el enlosado. Entre los dos rastrillos, las buhederas
  {
    const zr = zi + 1.2;
    // (el intradós de la bóveda: el de barrelVault, con su retranqueo)
    const R = pw / 2 - 0.03;
    const yb = ys + R - 0.42;
    for (const [u, f] of [
      [G.px0, 'e'],
      [G.px1 - 0.012, 'w'],
    ])
      wb.box('black', u, 0, zr - 0.06, u + 0.012, ys + 0.05, zr + 0.06, { faces: f, ao: false, grime: false, room });
    wb.box('black', G.px0 + 0.1, 0.033, zr - 0.06, G.px1 - 0.1, 0.035, zr + 0.06, { faces: 't', ao: false, grime: false, room });
    const N = 16,
      r = R - 0.012;
    for (let i = 0; i < N; i++) {
      const aa = Math.PI - (i / N) * Math.PI,
        ab = Math.PI - ((i + 1) / N) * Math.PI;
      const ua = pc + Math.cos(aa) * r,
        va = ys + Math.sin(aa) * r,
        ub = pc + Math.cos(ab) * r,
        vb = ys + Math.sin(ab) * r;
      wb.quad('black', V(ub, vb, zr - 0.06), V(ub, vb, zr + 0.06), V(ua, va, zr + 0.06), V(ua, va, zr - 0.06), { ao: false, grime: false, room });
    }
    // la reja: sus barrotes hasta la ranura, el travesaño de abajo y las
    // puntas
    const alto = (x) => ys + Math.sqrt(Math.max(0, r * r - (x - pc) * (x - pc)));
    for (let x = pc - 1.12; x <= pc + 1.13; x += 0.32) {
      wb.box('iron', x - 0.03, yb, zr - 0.03, x + 0.03, alto(x), zr + 0.03, { ao: false, faces: 'nsewb', room, tint: [0.62, 0.6, 0.58] });
      wb.box('iron', x - 0.018, yb - 0.16, zr - 0.018, x + 0.018, yb, zr + 0.018, { ao: false, faces: 'nsewb', room, tint: [0.62, 0.6, 0.58] });
    }
    const yc = yb + 0.16,
      hw = Math.sqrt(Math.max(0, r * r - (yc - ys) * (yc - ys))) - 0.02;
    wb.box('iron', pc - hw, yc - 0.04, zr - 0.04, pc + hw, yc + 0.04, zr + 0.04, { ao: false, faces: 'nsewtb', room, tint: [0.62, 0.6, 0.58] });
  }
  // los agujeros de las cadenas del puente, sobre el arco
  const PU = G.puente;
  for (const s of [-1, 1]) {
    const x = pc + s * (PU.w / 2 - 0.15);
    wb.box('black', x - 0.12, PU.yc - 0.15, zf + 0.012, x + 0.12, PU.yc + 0.15, zf + 0.02, { ao: false, grime: false, faces: 's' });
  }
  // el escudo del Rey sobre el arco, entre los matacanes de en medio
  {
    const ye = ys + rise + 1.8;
    wb.box('ashlar', pc - 0.8, ye, zf, pc + 0.8, ye + 1.9, zf + 0.12, { ao: false, faces: 'swetb', tint: PIEDRA.silla });
    wb.box('clothRed', pc - 0.55, ye + 0.25, zf + 0.12, pc + 0.55, ye + 1.45, zf + 0.14, { ao: false, faces: 's', tint: [0.7, 0.6, 0.6] });
    wb.box('silver', pc - 0.12, ye + 0.45, zf + 0.14, pc + 0.12, ye + 1.25, zf + 0.15, { ao: false, faces: 's' });
    wb.box('silver', pc - 0.4, ye + 0.85, zf + 0.14, pc + 0.4, ye + 1.0, zf + 0.15, { ao: false, faces: 's' });
    matacanes(ctx, 's', zf, G.px0 - 0.2, G.px1 + 0.2, G.hm - 2.2, { paso: 0.9 });
  }
  // la luz del paso: una antorcha a cada lado
  P.wallTorch(ctx, G.px0 + 0.02, 2.2, zi + 3.0, 'e', { room });
  P.wallTorch(ctx, G.px1 - 0.02, 2.2, zf - 4.2, 'w', { room });
  // bajo las buhederas, la pez que se echó por ellas, negra, y las manchas
  // que van hacia el rastrillo de fuera; contra él, abrasado, uno de la
  // guardia de la puerta, con los dedos entre los barrotes (el zaguán no
  // tenía nada: PLAN_FORTALEZA.md, fase 7)
  {
    for (const [dx, z, s] of [
      [0.2, BUHEDERAS[0], 1.7],
      [-0.3, BUHEDERAS[1], 1.9],
      [0.1, BUHEDERAS[2], 1.6],
      [0.5, -32.9, 1.1],
      [-0.2, -31.9, 0.9],
    ])
      P.decal(ctx, pc + dx, 0.03, z, s, 'shadow', null, { opacity: 0.95 });
    bakeCorpse(ctx.wb, pc + 0.45, 0.02, G.rastrillo - 1.25, 0.08, 'face', 'soldier', 4471, null, { tint: [0.46, 0.4, 0.36] });
    L.interact.push(
      { kind: 'examine', id: 'x_buhederas', text: 'buhederas', x: pc, y: 0, z: BUHEDERAS[1], r: 1.6 },
      { kind: 'examine', id: 'x_zaguan_muerto', text: 'zaguanMuerto', x: pc + 0.45, y: 0, z: G.rastrillo - 1.9, r: 1.1 }
    );
  }
  L.zones.push({ id: 'zaguan_fortaleza', rects: [[G.px0, zi + 0.6, G.px1, zf, -1, ys + rise]], atmo: 'interior', room });
  L.map.push({ id: 'zaguan_fortaleza', r: [G.px0, zi, G.px1, zf] });
}
// las buhederas: sobre el paso, en el suelo de la cámara del torno
const BUHEDERAS = [-37.2, -35.7, -34.2];

// ------------------------------------------------------------------------ la cámara del torno
// Sobre el paso, entre las dos torres: el torno del puente (el tambor entre
// sus caballetes, las cadenas que salen por el muro y el freno), la palanca y
// las poleas del rastrillo, las buhederas con sus rejas y las piedras para
// echar por ellas; y el alcaide, sentado contra el caballete, con sus últimas
// líneas. Una puerta a la armería (por el muro de la torre) y otra al cadalso
// (por la cara de fuera).
function camaraTorno(ctx, L) {
  const wb = ctx.wb;
  const room = ROOM.camara;
  const { x0, x1, z0, z1, top } = CAM;
  const zf = G.z1,
    zi = G.z0;
  const ct = [0.64, 0.61, 0.56];
  const gz = T.z1 - T.t; // la cara de dentro de la muralla de la guardia
  // la colisión de lo que la rodea, del suelo de la cámara a lo alto del
  // cuerpo de en medio: lo del norte, el muro de poniente, su suelo y lo de
  // encima (los de levante y del sur, con sus puertas, son muroVanos)
  ctx.col.add(G.x0, YB, zi, G.x1, G.hm, z0);
  ctx.col.add(G.x0, YB, z0, x0, G.hm, zf);
  ctx.col.add(x0, YB, z0, x1, F1, z1);
  ctx.col.add(x0, top, z0, x1, G.hm, z1);
  // (y el rincón de la torre de levante, entre su cara de fuera y su costado,
  // que no es de ninguno de los dos muros: si no, desde el cadalso se metía
  // uno en él)
  ctx.col.add(x1, YB, z1, G.x1, G.hm, zf);
  const dentro = [{ room, y0: F1, y1: top, tint: ct }];
  // el de levante: la puerta de la armería (a ella, la cara de la armería)
  const pa = { c: T.guardia.torno, w: 1.2, y: F1, h: 2.2, rise: 0.6, ring: 0.24, tint: PIEDRA.silla, archRooms: [room, ROOM.armeria] };
  muroVanos(ctx, 'z', z0, gz, x1, G.x1, YB, G.hm, [pa], dentro, [{ room: ROOM.armeria, y0: F1, y1: YT, tint: [0.74, 0.7, 0.64] }], { tint: ct, revealRoom: room });
  muroVanos(ctx, 'z', gz, z1, x1, G.x1, YB, G.hm, [], dentro, [], { tint: ct });
  // el del sur, la cara de fuera: la puerta del cadalso
  muroVanos(ctx, 'x', x0, x1, z1, zf, YB, G.hm, [{ c: T.cadalso.puerta, w: 1.1, y: F1, h: 2.2, rise: 0 }], dentro, [], { tint: ct, revealRoom: room });
  cara1(ctx, 'wallstone', 's', z0, x0, x1, F1, top, room, ct);
  cara1(ctx, 'wallstone', 'e', x0, z0, z1, F1, top, room, ct);
  // el suelo (con la ranura del rastrillo) y el techo
  const zr = G.rastrillo;
  const ranura = [G.px0, zr - 0.16, G.px1, zr + 0.16];
  for (const m of subtractRects([x0, z0, x1, z1], [ranura])) wb.box('flag', m[0], F1 - 0.05, m[1], m[2], F1, m[3], { faces: 't', ao: false, room, sub: 2.4, uv: 0.7, tint: [0.66, 0.63, 0.58] });
  wb.box('black', ranura[0], F1 - 0.3, ranura[1], ranura[2], F1 - 0.29, ranura[3], { faces: 't', ao: false, grime: false, room });
  wb.box('wooddark', x0, top, z0, x1, top + 0.02, z1, { faces: 'b', ao: false, room, tint: [0.46, 0.42, 0.38] });
  for (let x = x0 + 1.1; x < x1 - 0.5; x += 1.7) wb.box('timber', x - 0.15, top - 0.3, z0, x + 0.15, top, z1, { ao: false, faces: 'nsewb', room });
  // las saeteras de la cara de fuera, por dentro
  saeteraDentro(ctx, 'n', z1, (G.x0 + G.px0) / 2, 9.0, room);
  saeteraDentro(ctx, 'n', z1, (G.px1 + G.x1) / 2 - 0.4, 9.0, room);
  // --- el torno del puente: el tambor entre sus caballetes, las cadenas al
  // muro (salen por los agujeros de encima del arco) y el freno
  const PU = G.puente;
  const wz = z1 - 2.1,
    wy = F1 + 1.1;
  wb.setRoom(room);
  for (const s of [-1, 1]) {
    const x = pc + s * 2.35;
    beam(ctx, 'wooddark', V(x, F1, wz - 0.5), V(x, wy + 0.15, wz), 0.16, { room });
    beam(ctx, 'wooddark', V(x, F1, wz + 0.5), V(x, wy + 0.15, wz), 0.16, { room });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      beam(ctx, 'wooddark', V(x - s * 0.22, wy, wz), V(x - s * 0.22, wy + Math.cos(a) * 0.66, wz + Math.sin(a) * 0.66), 0.07, { room });
    }
  }
  wb.push();
  wb.translate(pc, wy, wz);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('wooddark', 0, -2.2, 0, 0.28, 0.28, 4.4, 10, { ao: false, capTop: true, capBot: true, room });
  for (const u of [-1.6, 1.6]) wb.cylinder('iron', 0, u - 0.2, 0, 0.32, 0.32, 0.4, 10, { ao: false, room });
  wb.pop();
  for (const s of [-1, 1]) {
    const a = V(pc + s * 1.6, wy + 0.25, wz + 0.12),
      b = V(pc + s * (PU.w / 2 - 0.15), PU.yc, z1 - 0.04);
    const n = 22;
    for (let k = 0; k < n; k++) beam(ctx, 'iron', a.clone().lerp(b, k / n), a.clone().lerp(b, (k + 0.8) / n), 0.06, { room, d: k % 2 ? 0.02 : 0.06 });
  }
  beam(ctx, 'iron', V(pc + 2.6, F1, wz - 0.3), V(pc + 2.85, F1 + 1.1, wz - 0.6), 0.06, { room });
  ctx.col.add(pc - 2.6, F1, wz - 0.55, pc + 2.6, wy + 0.4, wz + 0.55);
  wb.setRoom(null);
  L.interact.push({
    kind: 'bridge',
    id: 'b_puente_fort',
    flag: 'puente:fortaleza',
    x: pc,
    y: F1,
    z: wz - 1.2,
    r: 2.0,
    hinge: [pc, 0, zf],
    w: PU.w,
    len: PU.len,
    anchors: [
      [pc - (PU.w / 2 - 0.15), PU.yc, zf + 0.02],
      [pc + (PU.w / 2 - 0.15), PU.yc, zf + 0.02],
    ],
  });
  // --- el rastrillo: la viga con sus poleas sobre la ranura, el torno chico
  // contra el muro de poniente y su palanca
  {
    const yp = top - 0.45;
    wb.box('timber', G.px0 - 0.6, yp - 0.12, zr - 0.13, G.px1 + 0.6, yp + 0.12, zr + 0.13, { ao: false, faces: 'nsewb', room });
    for (const x of [pc - 1.2, pc + 1.2]) {
      wb.push();
      wb.translate(x, yp - 0.3, zr);
      wb.rotateX(Math.PI / 2);
      wb.cylinder('wooddark', 0, -0.07, 0, 0.18, 0.18, 0.14, 10, { ao: false, capTop: true, capBot: true, room });
      wb.pop();
      wb.box('rope', x - 0.02, F1, zr - 0.02, x + 0.02, yp - 0.3, zr + 0.02, { ao: false, room, tint: [0.75, 0.66, 0.52] });
    }
    const kx = x0 + 1.0,
      kz = zr - 1.4;
    for (const s of [-1, 1]) wb.box('wooddark', kx - 0.08, F1, kz + s * 0.55 - 0.08, kx + 0.08, F1 + 1.2, kz + s * 0.55 + 0.08, { ao: false, room });
    wb.push();
    wb.translate(kx, F1 + 1.0, kz);
    wb.rotateX(Math.PI / 2);
    wb.cylinder('wooddark', 0, -0.55, 0, 0.18, 0.18, 1.1, 10, { ao: false, capTop: true, capBot: true, room });
    wb.pop();
    beam(ctx, 'rope', V(kx, F1 + 1.15, kz), V(pc - 1.2, yp - 0.3, zr), 0.03, { room, tint: [0.75, 0.66, 0.52] });
    ctx.col.add(kx - 0.2, F1, kz - 0.7, kx + 0.2, F1 + 1.3, kz + 0.7);
    const lz = zr - 3.0;
    leverPlate(ctx, x0, F1, lz, 1, 0, room);
    L.interact.push({ kind: 'lever', id: 'p_rastrillo_fort', label: 'Subir el rastrillo', x: x0 + 0.45, y: F1, z: lz, nx: 1, nz: 0, gate: 'd_rastrillo_fort', quick: true, r: 1.6 });
  }
  // --- las buhederas, con sus rejas, y las piedras para echar por ellas
  for (const z of BUHEDERAS) {
    wb.box('black', pc - 0.3, F1 + 0.001, z - 0.3, pc + 0.3, F1 + 0.012, z + 0.3, { faces: 't', ao: false, grime: false, room });
    for (let k = -2; k <= 2; k++) wb.box('iron', pc - 0.32, F1, z + k * 0.13 - 0.02, pc + 0.32, F1 + 0.04, z + k * 0.13 + 0.02, { ao: false, room });
  }
  const rr = new RNG(7811);
  for (const [px, pz] of [
    [pc + 3.4, z0 + 0.7],
    [pc - 3.0, z0 + 0.7],
  ]) {
    for (let k = 0; k < 8; k++) {
      const r = 0.16 + rr.range(0, 0.08);
      wb.geometry('wallstone', new THREE.SphereGeometry(1, 6, 5), new THREE.Matrix4().compose(V(px + rr.range(-0.5, 0.5), F1 + r * (k > 5 ? 2.4 : 0.9), pz + rr.range(-0.3, 0.4)), new THREE.Quaternion(), V(r, r * 0.85, r)), { ao: false, room });
    }
    ctx.col.add(px - 0.65, F1, pz - 0.5, px + 0.65, F1 + 0.7, pz + 0.6);
  }
  P.barrel(ctx, x1 - 0.7, F1, z0 + 0.8, {});
  P.barrel(ctx, x1 - 1.5, F1, z0 + 0.7, {});
  // --- el alcaide, sentado contra el caballete del torno, con sus últimas
  // líneas en el regazo; la vela que se le acabó
  wb.setRoom(room);
  bakeCorpse(wb, pc - 2.35, F1, wz - 0.95, Math.PI, 'sit', 'soldier', 7812);
  P.decal(ctx, pc - 2.35, F1 + 0.01, wz - 1.0, 1.6);
  P.candles(ctx, pc - 1.5, F1, wz - 1.1, 2, 7813, { room, radius: 4, intensity: 0.7, spread: 0.08 });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_alcaide', note: 'alcaide', x: pc - 1.9, y: F1 + 0.02, z: wz - 1.35, model: 'paper' });
  // --- la luz
  P.brazier(ctx, pc + 3.2, F1, wz - 2.6, { room });
  P.wallTorch(ctx, x0 + 0.02, F1 + 2.3, z0 + 2.2, 'e', { room, radius: 6 });
  P.wallTorch(ctx, x1 - 0.02, F1 + 2.3, z1 - 1.0, 'w', { room, radius: 6 });
  L.zones.push({
    id: 'camara_torno',
    rects: [
      [x0, z0, x1, z1, YB, top],
      [x1, T.guardia.torno - 0.7, G.x1, T.guardia.torno + 0.7, YB, F1 + 3.2],
      [T.cadalso.puerta - 0.6, z1, T.cadalso.puerta + 0.6, zf, YB, F1 + 2.4],
    ],
    atmo: 'interior',
    room,
  });
  L.map.push({ id: 'camara_torno', r: [x0, z0, x1, z1] });
}

// La placa de hierro de una palanca de pared, con la ranura por la que baja
// el mango (el mango es interactuable: interact.js). (x, z): en la cara del
// muro; (nx, nz): hacia dónde mira; y: el suelo donde se pone quien tira.
function leverPlate(ctx, x, y, z, nx, nz, room) {
  const wb = ctx.wb;
  const tx = -nz,
    tz = nx;
  const px = (a, n) => x + tx * a + nx * n,
    pz = (a, n) => z + tz * a + nz * n;
  const bx = (a0, n0, a1, n1) => [Math.min(px(a0, n0), px(a1, n1)), Math.min(pz(a0, n0), pz(a1, n1)), Math.max(px(a0, n0), px(a1, n1)), Math.max(pz(a0, n0), pz(a1, n1))];
  let r = bx(-0.3, 0, 0.3, 0.08);
  wb.box('iron', r[0], y + 0.55, r[1], r[2], y + 1.75, r[3], { ao: false, room });
  r = bx(-0.05, 0.08, 0.05, 0.095);
  wb.box('black', r[0], y + 0.7, r[1], r[2], y + 1.6, r[3], { ao: false, grime: false, room });
  for (const s of [-1, 1]) {
    r = bx(s * 0.22 - 0.03, 0.08, s * 0.22 + 0.03, 0.1);
    for (const yy of [y + 0.68, y + 1.62]) wb.box('iron', r[0], yy - 0.03, r[1], r[2], yy + 0.03, r[3], { ao: false, room });
  }
}

// ------------------------------------------------------------------------ el foso y el puente
// Ante la puerta, al pie del talud de sus torres: el foso, con su forro de
// sillería, el fondo de tierra y las estacas (quien cae, se clava en ellas), y
// lo que quedó en él. El puente lo baja el torno de la cámara (interact.js).
function fosoPuente(ctx, S, L) {
  const wb = ctx.wb;
  const Fo = G.foso;
  const y = Fo.y;
  const mt = [0.6, 0.57, 0.52];
  ctx.slabHoles.push([Fo.x0, Fo.z0, Fo.x1, Fo.z1]);
  // el forro de los cuatro lados y su colisión (que no se ande por debajo del
  // suelo), y el fondo
  for (const [a, b, c, d, f] of [
    [Fo.x0, Fo.z0 - 0.4, Fo.x1, Fo.z0, 's'],
    [Fo.x0, Fo.z1, Fo.x1, Fo.z1 + 0.4, 'n'],
    [Fo.x0 - 0.4, Fo.z0, Fo.x0, Fo.z1, 'e'],
    [Fo.x1, Fo.z0, Fo.x1 + 0.4, Fo.z1, 'w'],
  ]) {
    wb.box('ashlar', a, y - 0.4, b, c, 0, d, { faces: f, sub: 1.6, aoH: 1.2, baseY: y, tint: mt });
    ctx.col.add(a, y - 1, b, c, 0, d);
  }
  wb.box('dirt', Fo.x0, y - 0.1, Fo.z0, Fo.x1, y, Fo.z1, { faces: 't', ao: false, sub: 2, tint: [0.4, 0.37, 0.32] });
  ctx.col.add(Fo.x0, y - 1, Fo.z0, Fo.x1, y, Fo.z1);
  // la albardilla del borde, a ras del suelo
  for (const [a, b, c, d] of [
    [Fo.x0 - 0.3, Fo.z1, Fo.x1 + 0.3, Fo.z1 + 0.3],
    [Fo.x0 - 0.3, Fo.z0, Fo.x0, Fo.z1],
    [Fo.x1, Fo.z0, Fo.x1 + 0.3, Fo.z1],
  ])
    wb.box('ashlar', a, 0, b, c, 0.06, d, { faces: 'tnsew', ao: false, tint: PIEDRA.silla });
  // las estacas, aguzadas, y lo que se clavó en ellas
  const rr = new RNG(7821);
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 3; j++) {
      const px = Fo.x0 + 0.7 + i * 1.1 + rr.range(-0.15, 0.15),
        pz = Fo.z0 + 0.7 + j * 1.3 + rr.range(-0.15, 0.15);
      const tip = V(px + rr.range(-0.2, 0.2), y + rr.range(1.0, 1.45), pz + rr.range(-0.2, 0.2));
      beam(ctx, 'timber', V(px, y, pz), tip, 0.08);
      const dir = tip.clone().sub(V(px, y, pz)).normalize();
      wb.geometry('timber', new THREE.ConeGeometry(0.055, 0.22, 4), new THREE.Matrix4().compose(tip.clone().addScaledVector(dir, 0.11), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(1, 1, 1)), { ao: false });
    }
  bakeCorpse(wb, Fo.x0 + 2.4, y + 0.9, Fo.z0 + 1.9, 0.6, 'back', 'soldier', 7822);
  P.decal(ctx, Fo.x0 + 2.4, y + 0.02, Fo.z0 + 1.9, 2.2);
  P.rubble(ctx, Fo.x1 - 1.4, y, Fo.z1 - 1.0, 6, 7823, 0.9, { mat: 'rock', scale: 0.7, blocks: 0.2 });
  L.pits.push({ r: [Fo.x0, Fo.z0, Fo.x1, Fo.z1], y0: y - 1, y1: -0.8, impale: true });
  // el aviso, desde el patio de armas, mientras está alzado
  L.interact.push({ kind: 'examine', id: 'x_puente_fort', text: 'puenteFortaleza', x: pc, y: 0, z: Fo.z1 + 0.9, r: 2.2, unless: 'puente:fortaleza' });
  void S;
}

// ------------------------------------------------------------------------ el cuerpo de guardia
// Abajo: la sala de la guardia, con la escalera por el muro de la torre de la
// puerta, la mesa de los dados, el atril del libro de la guarnición, las armas
// a mano; bajo el hundido del taller, el bolaño, las tablas y el cascajo.
function guardia(ctx, S, L) {
  const wb = ctx.wb;
  const Gd = T.guardia,
    SE = T.torres.SE;
  const room = ROOM.guardia;
  const { x0, x1, z0, z1 } = Gd;
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  cara1(ctx, 'wallstone', 'w', SE.x0, z0, z1, 0, YB, room, [0.74, 0.7, 0.64]);
  // la escalera a la armería, de piedra, por el muro de la torre: sube hacia
  // el sur; su pretil
  const E = Gd.escalera;
  const rise = F1 / E.n,
    run = (E.z1 - E.z0) / E.n;
  wb.setRoom(room);
  stairs(ctx, (E.x0 + E.x1) / 2, 0, E.z0, 's', E.x1 - E.x0, E.n, rise, run, 'wallstone', { solidBelow: true });
  wb.setRoom(null);
  for (let i = 3; i < E.n; i++) {
    const za = E.z0 + run * i,
      zb = za + run;
    const top = Math.min(rise * (i + 1) + 0.95, YB);
    // (arriba, donde el pretil ya no cabe bajo el suelo de la armería, nada)
    if (top - rise * (i + 1) < 0.05) continue;
    wb.box('wallstone', E.x1 - 0.2, rise * (i + 1), za, E.x1, top, zb, { ao: false, faces: 'tnsew', sub: 2, room, tint: [0.76, 0.73, 0.68] });
    ctx.col.add(E.x1 - 0.2, rise * (i + 1), za, E.x1, top, zb);
  }
  // la mesa de los dados, sus bancos y lo de encima; el atril del libro de la
  // guarnición
  wb.setRoom(room);
  const tx = -84.0,
    tz = -41.4;
  P.table(ctx, tx, 0, tz, 3.0, 1.0, 0, {});
  P.bench(ctx, tx, 0, tz - 0.85, 2.6, 0);
  P.bench(ctx, tx, 0, tz + 0.85, 2.6, 0);
  P.candles(ctx, tx + 0.8, 0.8, tz + 0.1, 3, 6411, { room, radius: 6, intensity: 0.8 });
  P.jar(ctx, tx - 0.9, 0.8, tz + 0.2, 0.55, { room });
  for (let k = 0; k < 3; k++) wb.box('bone', tx - 0.2 + k * 0.09, 0.8, tz + (k % 2) * 0.06, tx - 0.16 + k * 0.09, 0.84, tz + 0.04 + (k % 2) * 0.06, { ao: false, room });
  {
    const lx = -86.6,
      lz = -36.0;
    wb.box('wooddark', lx - 0.06, 0, lz - 0.06, lx + 0.06, 1.0, lz + 0.06, { ao: false, room });
    wb.box('wooddark', lx - 0.3, 0, lz - 0.2, lx + 0.3, 0.06, lz + 0.2, { ao: false, room });
    wb.at(lx, 1.0, lz, Math.PI, () => {
      wb.push();
      wb.rotateX(-0.45);
      wb.box('wooddark', -0.3, 0, -0.22, 0.3, 0.05, 0.22, { ao: false, room });
      wb.box('clothWhite', -0.26, 0.05, -0.18, 0.26, 0.07, 0.18, { ao: false, faces: 't', tint: [0.88, 0.8, 0.6], room });
      wb.pop();
    });
    ctx.col.add(lx - 0.3, 0, lz - 0.25, lx + 0.3, 1.1, lz + 0.25);
    L.interact.push({ kind: 'note', id: 'n_guarnicion', note: 'guarnicion', x: lx, y: 1.12, z: lz, model: 'paper' });
  }
  P.weaponRack(ctx, x1 - 0.35, 0, z0 + 2.4, -Math.PI / 2);
  P.weaponRack(ctx, x1 - 0.35, 0, z1 - 2.0, -Math.PI / 2);
  P.armorStand(ctx, -87.2, 0, z0 + 0.7, 0, { room });
  for (const x of [-85.4, -83.0]) P.hay(ctx, x, 0, z1 - 1.0, 0);
  P.barrel(ctx, x1 - 1.0, 0, (z0 + z1) / 2, {});
  P.brazier(ctx, -82.4, 0, -37.4, { room });
  P.arrows(ctx, x1 - 2.0, 0, z1 - 1.2, 6, 6412, 0.9);
  bakeCorpse(wb, -81.4, 0, z0 + 1.2, 0.2, 'back', 'soldier', 44);
  // bajo el hundido: el bolaño que lo hizo, las tablas y el cascajo
  {
    const H = Gd.hundido;
    const bx = (H[0] + H[2]) / 2,
      bz = (H[1] + H[3]) / 2;
    const rr = new RNG(7831);
    wb.geometry('wallstone', new THREE.SphereGeometry(0.46, 9, 7), new THREE.Matrix4().compose(V(bx + 0.9, 0.42, bz + 0.6), new THREE.Quaternion(), V(1, 0.92, 1)), { room });
    ctx.col.add(bx + 0.5, 0, bz + 0.2, bx + 1.3, 0.8, bz + 1.0);
    P.rubble(ctx, bx, 0, bz, 7, 7832, 1.0, { mat: 'wallstone', scale: 0.9, blocks: 0.3 });
    for (let k = 0; k < 5; k++) wb.at(bx + rr.range(-1, 1), 0.03 + k * 0.05, bz + rr.range(-1, 1), rr.range(0, 3), () => wb.box('planks', -0.6, 0, -0.09, 0.6, 0.05, 0.09, { ao: false, room, tint: [0.7, 0.6, 0.5] }));
  }
  wb.setRoom(null);
  P.wallTorch(ctx, x0 + 0.02, 2.4, z1 - 1.2, 'e', { room });
  P.wallTorch(ctx, x1 - 0.02, 2.4, z0 + 4.4, 'w', { room });
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.2, z: (z0 + z1) / 2, r: 1, g: 0.5, b: 0.24, radius: 11, intensity: 0.6, room });
  // (la luz del taller, que entra por el hundido)
  ctx.lights.push({ x: -79.2, y: 4.2, z: -38.8, r: 0.6, g: 0.62, b: 0.74, radius: 5, intensity: 0.4, room });
  L.interact.push({ kind: 'item', id: 'i_virotes_guardia', item: 'virote', n: 6, x: tx + 1.2, y: 0.82, z: tz - 0.3 });
  L.enemies.push({ type: 'soldier', x: tx - 1.6, y: 0, z: tz + 2.4, yaw: Math.PI, idle: 'stand', id: 'e_guardia1' }, { type: 'soldier', x: x1 - 2.4, y: 0, z: z0 + 1.6, yaw: -Math.PI / 2, idle: 'stand', id: 'e_guardia2' });
  L.zones.push({ id: 'guardia_fortaleza', rects: [[x0, z0, x1, z1, -1, YB]], atmo: 'interior', room });
  L.map.push({ id: 'guardia_fortaleza', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la armería y el taller
// La planta alta del cuerpo de guardia, a +5,5, bajo la terraza. La armería,
// adonde llega la escalera: las astas, los yelmos, las cotas, los barriles de
// virotes y la espada que nadie quiso; su puerta a la cámara del torno. El
// tabique, con sus dos arcos: el del escombro y el tapiado. El taller del
// ballestero: el boquete del bolaño en la muralla (se entra por él desde el
// cadalso), el suelo hundido, las vigas que cuelgan, el maestro bajo una de
// ellas, su tabla y, en el banco, la ballesta.
function plantaAlta(ctx, L) {
  const wb = ctx.wb;
  const Gd = T.guardia,
    TB = Gd.tabique,
    SE = T.torres.SE;
  const RA = ROOM.armeria,
    RT = ROOM.taller;
  const { x0, x1, z0, z1 } = Gd;
  const y = F1;
  const xt = (TB.x0 + TB.x1) / 2;
  const E = Gd.escalera;
  const hueco = [E.x0, E.z0 - 0.1, E.x1 + 0.1, E.z1 + 0.1];
  const H = Gd.hundido;
  const ta = [0.74, 0.7, 0.64];
  const rr = new RNG(7841);
  // los suelos, de tablas sobre la guardia, y el techo (lo de debajo de la
  // terraza)
  forjado(ctx, x0, z0, xt, z1, y, [hueco], RA, ROOM.guardia, { tint: [0.66, 0.58, 0.5] });
  forjado(ctx, xt, z0, x1, z1, y, [H], RT, ROOM.guardia, { tint: [0.66, 0.58, 0.5] });
  for (const [a, b, rm] of [
    [x0, xt, RA],
    [xt, x1, RT],
  ]) {
    wb.box('wooddark', a, YT, z0, b, YT + 0.02, z1, { faces: 'b', ao: false, room: rm, tint: [0.5, 0.45, 0.4] });
    for (let z = z0 + 0.9; z < z1 - 0.4; z += 1.7) wb.box('timber', a, YT - 0.28, z - 0.13, b, YT, z + 0.13, { ao: false, faces: 'nsewb', room: rm });
  }
  // los muros por dentro: el del patio (con sus ajimeces), el de la torre de
  // la puerta (la de la cámara, en muroVanos) y el del Tombo
  cara1(ctx, 'wallstone', 's', z0, x0, xt, y, YT, RA, ta);
  cara1(ctx, 'wallstone', 's', z0, xt, x1, y, YT, RT, ta);
  cara1(ctx, 'wallstone', 'e', G.x1, z0, CAM.z0, y, YT, RA, ta);
  cara1(ctx, 'wallstone', 'w', SE.x0, z0, z1, y, YT, RT, ta);
  // (el muro de poniente del Tombo, entero a esta altura: sus rincones no
  // tenían colisión por encima de la guardia, y desde el taller se llegaba)
  ctx.col.add(SE.x0, YB, SE.z0, SE.x0 + SE.t, T.walk, SE.z1);
  // (sobre la cara del muro, que está a un centímetro de su plano)
  ajimez(ctx, 's', z0 + 0.01, x0 + 3.5, 7.0, { h: 1.2, room: RA, boca: 'luna', radius: 4.5, intensity: 0.45 });
  ajimez(ctx, 's', z0 + 0.01, x1 - 3.5, 7.0, { h: 1.2, room: RT, boca: 'luna', radius: 4.5, intensity: 0.45 });
  // la muralla de la guardia, de la torre de la puerta a la del Tombo: por
  // fuera, su talud, sus saeteras y sus almenas; por dentro, la guardia abajo
  // y arriba la armería y el taller, con el boquete del bolaño
  {
    const Td = T.talud;
    const zi = T.z1 - T.t,
      zo = T.z1;
    const bandas = (rm) => [
      { room: ROOM.guardia, y0: 0, y1: YB, tint: [0.74, 0.7, 0.64] },
      { room: rm, y0: y, y1: YT, tint: ta },
    ];
    const fuera = [{ room: null, y0: Td.h - 0.05, y1: T.walk }];
    const B = Gd.boquete;
    muroVanos(ctx, 'x', x0, xt, zi, zo, 0, T.walk, [], bandas(RA), fuera, { tint: PIEDRA.lienzo });
    muroVanos(ctx, 'x', xt, x1, zi, zo, 0, T.walk, [{ c: B.x, w: B.w, y, h: B.h, rise: 0, room: RT }], bandas(RT), fuera, { tint: PIEDRA.lienzo, revealRoom: RT });
    talud(ctx, 's', zo, x0, x1, Td.h, Td.d, { ext: [0, Td.d] });
    almenas(ctx, 's', zo, x0, x1, T.walk);
    for (const x of [x0 + 4, x1 - 2.6]) saetera(ctx, 's', zo, x, 3.6);
    // (los bordes rotos del boquete: sillares sueltos y lo que cayó)
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) P.roughStone(ctx, B.x + s * (B.w / 2 + 0.12), y + 0.3 + k * 0.5, zo - 0.3 - rr.range(0, 1.6), rr.range(0.14, 0.24), 7842 + k + (s > 0 ? 4 : 0), { block: true, mat: 'wallstone', sink: 0, uvScale: 0.7 });
    for (let k = 0; k < 5; k++) P.roughStone(ctx, B.x + rr.range(-0.8, 0.8), y, zi - 0.2 - rr.range(0, 1.0), rr.range(0.1, 0.2), 7851 + k, { mat: 'wallstone', sink: 0 });
    // (el dintel, mordido: los sillares que quedaron colgando)
    for (let k = 0; k < 6; k++) P.roughStone(ctx, B.x - B.w / 2 + 0.15 + k * 0.26, y + B.h - 0.06 - rr.range(0, 0.18), zi + 0.25 + rr.range(0, 1.9), rr.range(0.16, 0.26), 7856 + k, { block: true, mat: 'wallstone', sink: 0, uvScale: 0.7 });
    // (y el cascajo, en las tablas del cadalso, delante)
    for (let k = 0; k < 4; k++) P.roughStone(ctx, B.x + rr.range(-0.9, 0.9), y, zo + 0.3 + rr.range(0, 0.6), rr.range(0.08, 0.15), 7862 + k, { mat: 'wallstone', sink: 0 });
  }
  // el tabique, con sus dos arcos
  const tb = [0.78, 0.75, 0.7];
  archedWall(ctx, {
    axis: 'z',
    a0: z0,
    a1: z1,
    t0: TB.x0,
    t1: TB.x1,
    y0: y,
    y1: YT,
    openings: [
      { c: TB.escombro, w: 1.3, h: 2.1, rise: 0.65, ring: 0.25 },
      { c: TB.tapiado, w: 1.3, h: 2.1, rise: 0.65, ring: 0.25 },
    ],
    mat: 'wallstone',
    tint: tb,
    rooms: [RA, RT],
    sub: 2,
  });
  // (los umbrales de sillería de los dos arcos, un dedo por encima de las
  // tablas)
  for (const zc of [TB.escombro, TB.tapiado]) wb.box('ashlar', TB.x0, y - 0.05, zc - 0.65, TB.x1, y + 0.012, zc + 0.65, { faces: 't', ao: false, room: RA, tint: [0.7, 0.68, 0.64] });
  // (el del escombro: lleno hasta la clave; entre las piedras, la luz)
  {
    const zc = TB.escombro;
    for (const [sx, seed] of [
      [-0.5, 7861],
      [0.5, 7862],
    ])
      P.rubble(ctx, xt + sx, y, zc, 9, seed, 0.8, { mat: 'wallstone', scale: 1.1, blocks: 0.8 });
    for (let k = 0; k < 7; k++) P.roughStone(ctx, xt + rr.range(-0.3, 0.3), y + 0.3 + k * 0.36, zc + rr.range(-0.4, 0.4), rr.range(0.24, 0.34), 7863 + k, { block: true, mat: 'wallstone', uvScale: 0.7, sink: 0, scl: [0.8, 0.7, 1] });
    ctx.col.add(TB.x0 - 0.6, y, zc - 0.7, TB.x1 + 0.6, y + 2.8, zc + 0.7);
    L.interact.push({ kind: 'examine', id: 'x_escombro_taller', text: 'escombroTaller', x: TB.x0 - 1.0, y, z: zc, r: 1.8 });
  }
  // (el tapiado: piedra y cal fresca, que rebosa por las juntas del lado de
  // la armería; se derriba desde el taller, y ya caído, sus escombros)
  {
    const zc = TB.tapiado,
      w = 1.3;
    ctx.beginGroup('puerta:d_tabique_taller');
    const tint = [0.94, 0.92, 0.86];
    wb.box('wallstone', xt - 0.2, y, zc - w / 2, xt + 0.2, y + 2.1, zc + w / 2, { sub: 1.2, aoH: 1, faces: 'ew', room: RA, tint });
    for (const [y0, y1, k] of [
      [2.1, 2.35, 0.0],
      [2.35, 2.55, 0.12],
      [2.55, 2.7, 0.3],
    ])
      wb.box('wallstone', xt - 0.2, y + y0, zc - w / 2 + k, xt + 0.2, y + y1, zc + w / 2 - k, { sub: 1.2, ao: false, faces: 'ewt', room: RA, tint });
    for (let k = 0; k < 5; k++) wb.box('plaster', xt - 0.22, y + 0.35 + k * 0.42, zc - w / 2 + 0.05, xt - 0.2, y + 0.39 + k * 0.42, zc + w / 2 - 0.05, { ao: false, faces: 'w', room: RA, tint: [1.0, 0.98, 0.92] });
    ctx.endGroup();
    ctx.beginGroup('puerta:d_tabique_taller:ruina');
    P.rubble(ctx, xt - 0.9, y, zc, 8, 7871, 0.8, { mat: 'wallstone', scale: 0.85, blocks: 0.4 });
    P.rubble(ctx, xt + 0.5, y, zc, 4, 7872, 0.5, { mat: 'wallstone', scale: 0.6 });
    ctx.endGroup();
    L.interact.push({ kind: 'door', id: 'd_tabique_taller', x: xt, y, z: zc, w, h: 2.75, axis: 'z', lock: { type: 'barred', side: 1, msg: 'tabiqueCae', sound: 'swingHeavy' }, barredMsg: 'tabique', mat: 'tabique' });
  }
  // el pretil del hueco de la escalera, en la armería
  {
    const [a, b, c, d] = hueco;
    for (const [p0, p1, q0, q1] of [
      [c - 0.08, b, c, d],
      [a, b - 0.08, c, b],
    ]) {
      wb.box('wooddark', p0, y + 0.95, p1, q0 + (q0 === c ? 0.08 : 0), y + 1.02, q1, { ao: false, faces: 'tnsewb', room: RA });
      ctx.col.add(p0, y, p1, q0 + (q0 === c ? 0.08 : 0), y + 1.3, q1);
    }
    for (let z = b + 0.4; z < d - 0.2; z += 0.6) wb.box('wooddark', c - 0.07, y, z - 0.03, c - 0.01, y + 0.95, z + 0.03, { ao: false, room: RA });
  }
  // --- la armería
  wb.setRoom(RA);
  for (const x of [-87.6, -85.4]) P.weaponRack(ctx, x, y, z0 + 0.32, 0);
  // (las astas, apoyadas en la muralla, al este de la puerta de la cámara)
  for (let k = 0; k < 9; k++) {
    const x = -88.2 + k * 0.46;
    beam(ctx, 'timber', V(x, y, z1 - 0.7), V(x + 0.05, y + 3.6, z1 - 0.12), 0.05, { room: RA });
    wb.box('iron', x - 0.03, y + 3.55, z1 - 0.16, x + 0.07, y + 3.85, z1 - 0.1, { ao: false, room: RA });
  }
  ctx.col.add(-88.5, y, z1 - 0.75, -84.0, y + 1.6, z1);
  P.armorStand(ctx, -84.4, y, -40.6, -Math.PI / 2, { room: RA });
  P.armorStand(ctx, -84.4, y, -42.0, -Math.PI / 2, { room: RA });
  for (const [x, z] of [
    [-86.0, -38.8],
    [-86.8, -38.0],
  ]) {
    P.barrel(ctx, x, y, z, {});
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      beam(ctx, 'timber', V(x + Math.cos(a) * 0.18, y + 0.9, z + Math.sin(a) * 0.18), V(x + Math.cos(a) * 0.24, y + 1.35, z + Math.sin(a) * 0.24), 0.03, { room: RA });
    }
  }
  P.crate(ctx, -87.4, y, -42.6, 0.75, 0.2);
  for (let k = 0; k < 12; k++) wb.box('timber', -87.7 + (k % 6) * 0.1, y + 0.75, -42.8 + Math.floor(k / 6) * 0.25, -87.68 + (k % 6) * 0.1, y + 1.05, -42.78 + Math.floor(k / 6) * 0.25, { ao: false, room: RA });
  P.dropped(ctx, -85.6, y, -36.2, 0.6, 'spear');
  P.dropped(ctx, -86.4, y, -43.6, 1.8, 'helmet');
  wb.setRoom(null);
  P.wallTorch(ctx, x0 + 0.02, y + 2.3, -40.6, 'e', { room: RA, radius: 6 });
  P.wallTorch(ctx, TB.x0 - 0.02, y + 2.3, -39.7, 'w', { room: RA, radius: 6 });
  // (la espada de munición que nadie quiso, comida de herrumbre; los virotes
  // del pañol)
  L.interact.push({ kind: 'item', id: 'i_oxidada', item: 'oxidada', x: -85.0, y: y + 0.08, z: -37.4 }, { kind: 'item', id: 'i_virotes_armeria', item: 'virote', n: 12, x: -87.4, y: y + 0.78, z: -42.6 });
  // --- el taller del ballestero
  wb.setRoom(RT);
  // el suelo hundido hacia el hueco, las astillas y las vigas que cuelgan
  for (let k = 0; k < 5; k++) {
    const z = H[1] + 0.2 + k * ((H[3] - H[1] - 0.4) / 4);
    beam(ctx, 'planks', V(H[0] - 0.1, y - 0.03, z), V(H[0] + rr.range(0.7, 1.1), y - rr.range(0.5, 0.9), z + rr.range(-0.1, 0.1)), 0.2, { room: RT, d: 0.05 });
    beam(ctx, 'planks', V(H[2] + 0.1, y - 0.03, z), V(H[2] - rr.range(0.5, 0.8), y - rr.range(0.4, 0.8), z + rr.range(-0.1, 0.1)), 0.2, { room: RT, d: 0.05 });
  }
  for (const [x, z, a] of [
    [-79.6, -38.2, 0.6],
    [-78.6, -39.4, -0.4],
  ])
    beam(ctx, 'wooddark', V(x, YT - 0.1, z), V(x + Math.sin(a) * 1.4, YT - 2.2, z + Math.cos(a) * 0.4), 0.2, { room: RT });
  // la viga que mató al maestro: tumbada, sobre él (se rodea: alta para
  // subirse, que la caja es más ancha que la viga)
  bakeCorpse(wb, -80.0, y, -42.4, 0.3, 'back', 'villager', 4493);
  beam(ctx, 'timber', V(-81.6, y + 0.05, -43.2), V(-78.2, y + 0.32, -41.6), 0.26, { room: RT });
  ctx.col.add(-81.6, y, -43.4, -78.2, y + 1.1, -41.4);
  P.decal(ctx, -80.0, y + 0.01, -42.4, 2.0);
  // el banco, con la ballesta y su tabla; la caja de los virotes
  P.table(ctx, -77.6, y, -36.6, 1.6, 0.8, Math.PI / 2);
  P.stool(ctx, -78.4, y, -36.6, { room: RT });
  for (let k = 0; k < 8; k++) wb.box('timber', -77.85, y + 0.82, -37.1 + k * 0.14, -77.45, y + 0.835, -37.08 + k * 0.14, { ao: false, room: RT });
  P.crate(ctx, -77.0, y, -43.4, 0.75, 0);
  for (let k = 0; k < 12; k++) wb.box('timber', -77.3 + (k % 6) * 0.1, y + 0.75, -43.6 + Math.floor(k / 6) * 0.25, -77.28 + (k % 6) * 0.1, y + 1.05, -43.58 + Math.floor(k / 6) * 0.25, { ao: false, room: RT });
  // escudos colgados del muro del patio, ballestas en el del Tombo
  for (let x = -82.0; x < -80.3; x += 0.85)
    wb.at(x, y, z0 + 0.25, 0, () => {
      wb.box('planks', -0.33, 0, -0.04, 0.33, 0.85, 0.04, { ao: false, faces: 'tnsewb', tint: [0.6, 0.5, 0.42], room: RT });
      wb.box('iron', -0.06, 0.38, 0.04, 0.06, 0.5, 0.08, { ao: false, room: RT });
    });
  wb.box('planks', x1 - 0.06, y + 1.5, -42.6, x1, y + 2.6, -38.8, { ao: false, room: RT, tint: [0.62, 0.55, 0.48] });
  for (let z = -42.1; z < -39.0; z += 0.9) {
    beam(ctx, 'wooddark', V(x1 - 0.1, y + 1.6, z), V(x1 - 0.1, y + 2.45, z), 0.07, { room: RT });
    beam(ctx, 'wooddark', V(x1 - 0.1, y + 2.25, z - 0.32), V(x1 - 0.1, y + 2.25, z + 0.32), 0.06, { room: RT });
  }
  wb.setRoom(null);
  P.wallTorch(ctx, TB.x1 + 0.02, y + 2.2, -41.0, 'e', { room: RT, radius: 7 });
  P.wallTorch(ctx, x1 - 0.02, y + 2.2, -36.6, 'w', { room: RT, radius: 6 });
  ctx.lights.push({ x: Gd.boquete.x, y: y + 1.2, z: T.z1 - T.t - 0.8, r: 0.5, g: 0.58, b: 0.78, radius: 4.5, intensity: 0.5, room: RT });
  L.interact.push(
    { kind: 'item', id: 'i_ballesta', item: 'ballesta', x: -77.6, y: y + 0.84, z: -36.9 },
    { kind: 'note', id: 'n_ballestero', note: 'ballestero', x: -77.55, y: y + 0.84, z: -36.2, model: 'paper' },
    { kind: 'item', id: 'i_virotes_taller', item: 'virote', n: 10, x: -77.0, y: y + 0.8, z: -43.4 }
  );
  // zonas y mapa (la armería, con la boca de su puerta a la cámara)
  L.zones.push(
    { id: 'armeria_fortaleza', rects: [[x0, z0, xt, z1, YB, YT]], atmo: 'interior', room: RA },
    {
      id: 'taller_ballestero',
      rects: [
        [xt, z0, x1, z1, YB, YT],
        [Gd.boquete.x - Gd.boquete.w / 2, T.z1 - T.t, Gd.boquete.x + Gd.boquete.w / 2, T.z1, YB, y + Gd.boquete.h],
      ],
      atmo: 'interior',
      room: RT,
    }
  );
  L.map.push({ id: 'armeria_fortaleza', r: [x0, z0, xt, z1] }, { id: 'taller_ballestero', r: [xt, z0, x1, z1] });
}

// ------------------------------------------------------------------------ el cadalso
// La galería de madera colgada por fuera, a la altura de la planta alta:
// delante de la torre de levante de la puerta (se sale a ella por la puerta
// de la cámara del torno), doblando su esquina, y delante de la muralla de la
// guardia hasta el Tombo. Sus tablas sobre las vigas que salen del muro con
// sus tornapuntas, la pantalla de fuera con sus troneras, el tejadillo y las
// tablas que faltan; en el cabo, la garita del alférez, con su brasero.
function cadalso(ctx, L) {
  const wb = ctx.wb;
  const C = T.cadalso;
  const y = C.y,
    w = C.w;
  const zf = G.z1,
    zc = T.z1,
    xe = G.x1;
  const rr = new RNG(7881);
  const tablas = [0.66, 0.58, 0.5];
  const R = [
    { r: [C.x0, zf, xe + w, zf + w], ax: 'x', muro: zf },
    { r: [xe, zc + w, xe + w, zf], ax: 'z', muro: xe },
    { r: [xe, zc, C.x1, zc + w], ax: 'x', muro: zc },
  ];
  // tablas que faltan: [x0, z0, x1, z1]
  const gaps = [
    [-94.6, zf + 0.95, -93.8, zf + w],
    [-86.6, zc + 0.95, -85.7, zc + w],
    [-79.6, zc, -78.9, zc + 0.85],
  ];
  for (const { r, ax, muro } of R) {
    for (const m of subtractRects(r, gaps)) {
      wb.box('planks', m[0], y - 0.08, m[1], m[2], y, m[3], { faces: 'tb', ao: false, uv: 0.8, tint: tablas });
      ctx.col.add(m[0], y - 0.4, m[1], m[2], y, m[3]);
    }
    // las vigas que salen del muro, con sus tornapuntas
    // (delante de la torre, sólo donde hay torre detrás: en su esquina, las
    // vigas salen de su costado)
    if (ax === 'x')
      for (let x = r[0] + 0.5; x < (muro === zf ? xe - 0.1 : r[2]); x += 1.4) {
        wb.box('timber', x - 0.1, y - 0.32, r[1], x + 0.1, y - 0.08, r[3], { ao: false, faces: 'nsewb' });
        beam(ctx, 'timber', V(x, y - 1.6, muro), V(x, y - 0.3, muro + w - 0.25), 0.12);
      }
    else
      for (let z = r[1] + 0.4; z < r[3]; z += 1.2) {
        wb.box('timber', r[0], y - 0.32, z - 0.1, r[2], y - 0.08, z + 0.1, { ao: false, faces: 'nsewb' });
        beam(ctx, 'timber', V(muro, y - 1.6, z), V(muro + w - 0.25, y - 0.3, z), 0.12);
      }
  }
  // (las que se hundieron, abajo, en el suelo del patio de armas)
  for (const g of gaps) for (let k = 0; k < 2; k++) wb.at((g[0] + g[2]) / 2 + rr.range(-0.4, 0.4), 0.02 + k * 0.055, (g[1] + g[3]) / 2 + rr.range(0.6, 1.4), rr.range(0, 3), () => wb.box('planks', -0.5, 0, -0.1, 0.5, 0.05, 0.1, { ao: false, tint: tablas }));
  // la pantalla de fuera, con sus troneras, cerrada en los cabos
  const scr = (a, b, c, d, f) => {
    wb.box('planks', a, y, b, c, y + 2.0, d, { faces: f, ao: false, uv: 0.9, tint: [0.6, 0.52, 0.45] });
    ctx.col.add(a, y, b, c, y + 2.4, d);
  };
  // (sin solaparse en las esquinas: sus caras parpadeaban)
  scr(C.x0 - 0.06, zf, C.x0, zf + w, 'nsewt');
  scr(C.x0 - 0.06, zf + w, xe + w + 0.06, zf + w + 0.06, 'nsewt');
  scr(xe + w, zc + w + 0.06, xe + w + 0.06, zf + w, 'nsewt');
  scr(xe + w, zc + w, C.x1 + 0.06, zc + w + 0.06, 'nsewt');
  scr(C.x1, zc, C.x1 + 0.06, zc + w, 'nsewt');
  for (let x = C.x0 + 0.9; x < xe + w - 0.4; x += 1.6) wb.box('black', x - 0.07, y + 0.7, zf + w + 0.06, x + 0.07, y + 1.6, zf + w + 0.072, { ao: false, faces: 's', grime: false });
  for (let x = xe + w + 1.0; x < C.garita - 0.4; x += 1.6) wb.box('black', x - 0.07, y + 0.7, zc + w + 0.06, x + 0.07, y + 1.6, zc + w + 0.072, { ao: false, faces: 's', grime: false });
  wb.box('black', xe + w + 0.06, y + 0.7, zf - 0.3, xe + w + 0.072, y + 1.6, zf + 0.3, { ao: false, faces: 'e', grime: false });
  // el tejadillo, a un agua, del muro a la pantalla (delante de la torre,
  // en su esquina y delante de la muralla)
  const yh = y + 2.95,
    yl = y + 2.25;
  const roof = (a, b, c, d) => {
    wb.quad('wooddark', a, b, c, d, { ao: false, sub: 2, tint: [0.55, 0.48, 0.42] });
    wb.quad('wooddark', d, c, b, a, { ao: false, sub: 2, tint: [0.42, 0.37, 0.33] });
  };
  roof(V(C.x0 - 0.2, yh, zf), V(xe + w + 0.2, yh, zf), V(xe + w + 0.2, yl, zf + w + 0.2), V(C.x0 - 0.2, yl, zf + w + 0.2));
  roof(V(xe, yh, zc + w), V(xe, yh, zf), V(xe + w + 0.2, yl, zf), V(xe + w + 0.2, yl, zc + w));
  roof(V(xe, yh, zc), V(C.x1 + 0.2, yh, zc), V(C.x1 + 0.2, yl, zc + w + 0.2), V(xe, yl, zc + w + 0.2));
  ctx.col.addCam(C.x0, yl, zf, xe + w, yh, zf + w);
  ctx.col.addCam(xe, yl, zc, C.x1, yh, zc + w);
  // la garita del alférez, en el cabo: sus tablas, su tejado a cuatro aguas y
  // su brasero
  {
    const gx0 = C.garita,
      gx1 = C.x1,
      gz0 = zc,
      gz1 = zc + w,
      top = y + 2.5;
    wb.box('planks', gx0, y + 2.0, gz1, gx1 + 0.06, top, gz1 + 0.06, { ao: false, tint: [0.6, 0.52, 0.45] });
    wb.box('planks', gx1, y + 2.0, gz0, gx1 + 0.06, top, gz1, { ao: false, tint: [0.6, 0.52, 0.45] });
    const cx = (gx0 + gx1) / 2,
      cz = (gz0 + gz1) / 2;
    for (const [a, b] of [
      [V(gx0 - 0.15, top, gz0 - 0.1), V(gx1 + 0.15, top, gz0 - 0.1)],
      [V(gx1 + 0.15, top, gz0 - 0.1), V(gx1 + 0.15, top, gz1 + 0.15)],
      [V(gx1 + 0.15, top, gz1 + 0.15), V(gx0 - 0.15, top, gz1 + 0.15)],
      [V(gx0 - 0.15, top, gz1 + 0.15), V(gx0 - 0.15, top, gz0 - 0.1)],
    ])
      wb.quad('wooddark', a, b, V(cx, top + 1.1, cz), V(cx, top + 1.1, cz), { ao: false, tint: [0.5, 0.44, 0.4] });
    P.brazier(ctx, gx1 - 0.45, y, gz0 + 0.45, {});
  }
  // un caído de la guardia y un haz de virotes, delante de la torre
  bakeCorpse(wb, -94.0, y, zf + 0.7, 1.4, 'back', 'soldier', 4491);
  P.decal(ctx, -94.0, y + 0.01, zf + 0.7, 1.8);
  L.interact.push({ kind: 'item', id: 'i_virotes_cadalso', item: 'virote', n: 4, x: -89.4, y: y + 0.1, z: zf + 0.8 });
  // el alférez, en su garita, vigilando el cadalso; su llave y su carcaj,
  // donde caiga
  const ax = (C.garita + C.x1) / 2,
    az = zc + w / 2;
  L.enemies.push({ type: 'alferez', x: ax, y, z: az, yaw: -Math.PI / 2, idle: 'watch', id: 'e_alferez', story: 'dead:alferez', dies: 'dead:alferez' });
  L.interact.push(
    { kind: 'item', id: 'i_llave_alferez', item: 'llave_alferez', afterFlag: 'dead:alferez', x: ax - 0.4, y: y + 0.08, z: az + 0.3 },
    { kind: 'item', id: 'i_virotes_alferez', item: 'virote', n: 6, afterFlag: 'dead:alferez', x: ax + 0.3, y: y + 0.08, z: az - 0.3 }
  );
  L.zones.push({
    id: 'cadalso_puerta',
    rects: R.map(({ r }) => [...r, y - 0.4, y + 3.0]),
    atmo: 'ramparts',
  });
  L.map.push({ id: 'cadalso_puerta', r: [C.x0, zc, C.x1, zf + w] });
}

