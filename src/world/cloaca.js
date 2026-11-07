// La cloaca (zona nueva, bajo la plaza del Pan): la bodega de la Taberna del
// Cuervo, la cloaca romana de Bracara y la sala de la luz.
//
// La trampilla de la despensa de la taberna (la que el tabernero clavó con
// dos tablones: «algo rasca las cubas») se arranca con la palanca de la
// fragua. Abajo, la bodega: las cubas, las ratas y, en el muro del sur, el
// boquete por el que se le vino la bodega encima a la cloaca de los
// romanos. Por él se baja al canal: una galería de sillería bajo su bóveda de
// medio cañón, con el agua corriendo por en medio, que lleva hacia el sur,
// bajo la calle del Soto y la plaza del Pan, hasta una sala grande: la
// cisterna donde se juntaban las aguas, cuatro pilares y sus arcos.
//
// Encima de esa sala ardió una casa (la quemada del sur de la plaza: su
// tejado se lo comió el fuego) y, después, se le hundió el suelo. Por el
// agujero baja la luna: un haz de luz pálida que cae sobre los escombros, y
// en los escombros, donde cae la luz y el agua de la lluvia, ha crecido de
// todo: helechos, hierba, musgo, flores blancas, una higuera; la hiedra baja
// por el agujero. El agua del canal cae desde lo alto de la galería en una
// cascada, llena una alberca y rodea la isla de verde por sus dos acequias.
// En medio, en la luz, de pie, mirando al cielo: el Desfigurado.
//
// Medidas: CLOACA. La rejilla (Q) la pone level.js; el agujero en la losa de
// la calle, también (CLOACA.ojo). Lo que se mueve (la cascada, el agua que
// se revuelve al pie) lo pone game/cloaca.js; lo que hace el Desfigurado,
// game/desfigurado.js.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { stairs, barrelVault, archRing, solid } from './builders.js';
import * as P from './props.js';
import * as M from './mobiliario.js';
import { helecho, hierba, flores, musgo, hiedra, raices, juncos, higuera, montecillo, hongos } from './verdor.js';
import { bakeCorpse } from '../entities/models.js';
import { buildVergel, VERGEL } from './vergel.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// La casa quemada del sur de la plaza (level_city.js): su planta y su alto
// (el mismo que saca su constructor de su semilla)
const CASA = { x0: -12.5, z0: 14, x1: -3.5, z1: 22, t: 0.35, h: new RNG(203).range(5.6, 8.4) };

export const CLOACA = {
  // la rejilla de lo transitable (x0, z0, x1, z1) y la roca (de y0 a y1)
  // (con el Vergel, que sigue al este: world/vergel.js)
  grid: [-21, -20, 36.5, 42.5],
  y0: -12.8,
  y1: -1.1,
  // la bodega de la taberna (bajo su despensa) y la trampilla (en el rincón
  // de la despensa: level_barrios.js)
  bodega: { x0: -20.0, x1: -13.6, z0: -19.0, z1: -12.0, y: -3.4, top: -1.2 },
  trampilla: { x: -15.2, z: -13.0 },
  // el boquete y la bajada al canal (de la bodega, hacia el sur)
  bajada: { x0: -16.0, x1: -14.6, z0: -12.0, z1: -9.6, n: 6, rise: 0.3, run: 0.4 },
  // la galería: los andenes (y), el canal (de c0 a c1, su fondo cy y su agua),
  // el arranque de la bóveda (ys)
  tunel: { x0: -16.0, x1: -12.8, z0: -9.6, z1: 9.0, y: -5.2, ys: -3.6, c0: -14.5, c1: -13.4, cy: -5.55, agua: -5.33 },
  // la sala de la luz: su suelo, su techo; el rellano de la galería (a la
  // altura de sus andenes) y la escalera que baja por el muro del norte
  sala: { x0: -16.0, x1: 0.0, z0: 9.0, z1: 27.0, y: -9.0, top: -1.3, rellano: [-16.0, 9.0, -12.8, 10.4], esc: { x: -7.4, z: 9.7, w: 1.4, n: 13, run: 0.415 } },
  // las acequias (su fondo y su agua), la alberca, la isla
  canal: { y: -9.35, agua: -9.12 },
  alberca: [-15.8, 10.4, -12.2, 13.6],
  oeste: [-14.4, 13.6, -13.2, 24.6],
  sur: [-14.4, 23.4, 0.0, 24.6],
  isla: { x: -8.0, z: 18.0, y: -8.65 },
  pilares: [
    [-12.4, 13.4],
    [-3.6, 13.4],
    [-12.4, 22.4],
    [-3.6, 22.4],
  ],
  // el agujero de la losa (por metros enteros) y la casa de encima
  ojo: [-11, 15, -5, 21],
  casa: CASA,
  // donde está él (en la luz, de cara a poniente: el lado sano hacia la
  // escalera, por donde se llega)
  desfigurado: { x: -8.25, z: 18.3, yaw: -Math.PI / 2 },
  // la cascada: de la boca del conducto (bajo el rellano) a la alberca
  cascada: { x0: -14.45, x1: -13.45, z: 10.42, y0: -5.35, y1: -9.12 },
};

const ROOMS = { bodega: 'cloaca_bodega', tunel: 'cloaca', sala: 'cloaca_luz' };

// la boca de la galería del desagüe, en el muro de levante de la sala (la
// galería, del kit de las cloacas: cloacas_hondas.js)
export const DESAGUE = { z: 24, w: 3.4, h: 3.4 / 2 + 0.3 };

export function buildCloaca(ctx, Q, L) {
  // (si a la casa quemada de encima le quedaba fuego en el desván, se apagó:
  // por el agujero baja la luna, no el resplandor)
  for (let i = ctx.fires.length - 1; i >= 0; i--) {
    const f = ctx.fires[i];
    if (f.x > CASA.x0 && f.x < CASA.x1 && f.z > CASA.z0 && f.z < CASA.z1 && f.y > 2) ctx.fires.splice(i, 1);
  }
  for (let i = ctx.lights.length - 1; i >= 0; i--) {
    const f = ctx.lights[i];
    if (f.x > CASA.x0 && f.x < CASA.x1 && f.z > CASA.z0 && f.z < CASA.z1 && f.y > 2 && f.r > f.b) ctx.lights.splice(i, 1);
  }
  bodega(ctx, Q, L);
  bajada(ctx, Q);
  tunel(ctx, Q, L);
  sala(ctx, Q, L);
  zonas(L);
  // y más allá de la reja de levante, el caño y el Vergel
  buildVergel(ctx, Q, L);
}

// ------------------------------------------------------------------------ la bodega
function bodega(ctx, Q, L) {
  const wb = ctx.wb,
    col = ctx.col;
  const B = CLOACA.bodega,
    T = CLOACA.trampilla,
    D = CLOACA.bajada;
  const room = ROOMS.bodega;
  const { x0, x1, z0, z1, y, top } = B;
  Q.paint(x0, z0, x1, z1, 1);
  wb.setRoom(room);
  wb.box('flag', x0, y - 0.1, z0, x1, y, z1, { faces: 't', ao: false, sub: 2, tint: [0.46, 0.43, 0.4] });
  col.add(x0, y - 1, z0, x1, y, z1, 'floor').cam = true;
  const wo = { sub: 1.6, aoH: 1.4, aoMin: 0.45, baseY: y, room, tint: [0.56, 0.54, 0.5] };
  wb.box('wallstone', x0 - 0.3, y, z0, x0, top, z1, { ...wo, faces: 'e' });
  wb.box('wallstone', x1, y, z0, x1 + 0.3, top, z1, { ...wo, faces: 'w' });
  wb.box('wallstone', x0, y, z0 - 0.3, x1, top, z0, { ...wo, faces: 's' });
  // el muro del sur, reventado: el boquete de la bajada, de bordes rotos
  wb.box('wallstone', x0, y, z1, D.x0, top, z1 + 0.3, { ...wo, faces: 'n' });
  wb.box('wallstone', D.x1, y, z1, x1, top, z1 + 0.3, { ...wo, faces: 'n' });
  wb.box('wallstone', D.x0, y + 2.0, z1, D.x1, top, z1 + 0.3, { ...wo, faces: 'nb' });
  const rr = new RNG(9101);
  for (let k = 0; k < 7; k++) {
    const side = k % 2 ? D.x0 : D.x1;
    P.roughStone(ctx, side + (k % 2 ? 0.08 : -0.08), y + rr.range(0.2, 1.8), z1 + 0.05, rr.range(0.16, 0.3), 9102 + k, { room, tint: [0.5, 0.48, 0.45] });
  }
  P.rubble(ctx, (D.x0 + D.x1) / 2, y, z1 - 0.6, 7, 9110, 0.8);
  // el techo de vigas, con el hueco de la trampilla
  const hx0 = T.x - 0.6,
    hx1 = T.x + 0.6,
    hz0 = T.z - 0.6,
    hz1 = T.z + 0.6;
  for (const [a, b, c, d] of [
    [x0, z0, x1, hz0],
    [x0, hz1, x1, z1],
    [x0, hz0, hx0, hz1],
    [hx1, hz0, x1, hz1],
  ]) {
    wb.box('planks', a, top, b, c, top + 0.05, d, { faces: 'b', ao: false, sub: 2, tint: [0.4, 0.36, 0.32] });
    col.add(a, top, b, c, -1.0, d).cam = true;
  }
  // (el hueco: su marco y lo negro de arriba, la trampilla cerrada)
  wb.box('wooddark', hx0 - 0.06, top - 0.12, hz0 - 0.06, hx1 + 0.06, top, hz0, { ao: false, faces: 'nsb' });
  wb.box('wooddark', hx0 - 0.06, top - 0.12, hz1, hx1 + 0.06, top, hz1 + 0.06, { ao: false, faces: 'nsb' });
  wb.box('black', hx0, top + 0.25, hz0, hx1, top + 0.27, hz1, { faces: 'b', ao: false, grime: false });
  for (const x of [-19.0, -17.4, -15.8, -14.4]) wb.box('timber', x - 0.12, top - 0.22, z0, x + 0.12, top, z1, { ao: false, faces: 'nsewb', room });
  col.addCam(x0, top - 0.26, z0, x1, top, z1);
  // la escalera de mano, contra el canto del hueco
  {
    const fx = T.x,
      fz = T.z - 0.55;
    for (const s of [-1, 1]) P.rod(ctx, V(fx + s * 0.22, y, fz - 0.55), V(fx + s * 0.22, top + 0.2, fz), 0.03, 0.028, 'wooddark', { room, segs: 4 });
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const yy = y + (top + 0.2 - y) * t,
        zz = fz - 0.55 + 0.55 * t;
      wb.box('wooddark', fx - 0.22, yy - 0.02, zz - 0.02, fx + 0.22, yy + 0.02, zz + 0.02, { ao: false, faces: 'tnsewb' });
    }
    col.add(fx - 0.3, y, fz - 0.6, fx + 0.3, top, fz + 0.05);
  }
  // las cubas (las que rascaba algo), los toneles, la estantería
  P.cask(ctx, x0 + 0.75, y, z0 + 1.0, Math.PI / 2, { room, r: 0.55, len: 1.3 });
  P.cask(ctx, x0 + 0.75, y, z0 + 2.6, Math.PI / 2, { room, r: 0.55, len: 1.3 });
  P.cask(ctx, x0 + 0.75, y, z0 + 4.15, Math.PI / 2, { room, r: 0.5, len: 1.2 });
  // (una, reventada por abajo: el vino negro en el suelo y las uñas en la
  // madera)
  P.decal(ctx, x0 + 1.5, y + 0.02, z0 + 2.6, 1.8, 'splat', 0.6);
  for (let k = 0; k < 5; k++) wb.box('black', x0 + 0.2, y + 0.3 + k * 0.08, z0 + 2.2 + k * 0.05, x0 + 0.24, y + 0.36 + k * 0.08, z0 + 2.5 + k * 0.05, { ao: false, faces: 'e', grime: false, tint: [0.3, 0.26, 0.24] });
  P.barrel(ctx, x1 - 0.6, y, z0 + 0.6, {});
  P.barrel(ctx, x1 - 1.4, y, z0 + 0.55, { r: 0.34, h: 0.85 });
  P.barrel(ctx, x1 - 0.7, y, z0 + 1.6, { lying: true, rot: 1.2 });
  P.shelf(ctx, (x0 + x1) / 2 - 0.4, y, z0 + 0.22, 0, 1.8);
  P.crate(ctx, x0 + 0.7, y, z1 - 0.8, 0.8, 0.2);
  P.sacks(ctx, x0 + 2.0, y, z1 - 0.7, 3, 9111);
  P.bones(ctx, x0 + 2.4, y, z0 + 3.4, 8, 9112, 0.9);
  wb.setRoom(null);
  ctx.rats.push({ x: x0 + 1.6, y, z: z0 + 2.0, n: 3 }, { x: x1 - 1.2, y, z: z1 - 1.0, n: 2 });
  // (lo poco que llega: un resplandor frío del boquete, de la cloaca)
  ctx.lights.push({ x: (D.x0 + D.x1) / 2, y: y + 1.0, z: z1 - 0.4, r: 0.36, g: 0.44, b: 0.5, radius: 4.5, intensity: 0.45, room });
  // la trampilla: arriba, en la despensa de la taberna (clavada: con la
  // palanca); abajo, al pie de la escalera de mano
  L.interact.push(
    { kind: 'hatch', id: 'h_bodega_arriba', end: 'top', flag: 'hatch:bodega', needs: 'palanca', boards: true, msgDown: 'bodegaBaja', openMsg: 'bodegaAbre', shutMsg: 'bodegaClavada', x: T.x, y: 0, z: T.z, r: 1.5, to: [T.x, y, T.z - 1.65, Math.PI] },
    { kind: 'hatch', id: 'h_bodega_abajo', end: 'bottom', flag: 'hatch:bodega', msgUp: 'bodegaSube', shutMsg: 'bodegaArriba', x: T.x, y, z: T.z - 0.8, r: 1.4, to: [T.x - 0.5, 0, T.z - 1.0, Math.PI] }
  );
  L.interact.push({ kind: 'examine', id: 'x_cubas', text: 'cubasBodega', x: x0 + 1.4, y, z: z0 + 2.6, r: 1.3 });
}

// ------------------------------------------------------------------------ la bajada
function bajada(ctx, Q) {
  const wb = ctx.wb,
    col = ctx.col;
  const D = CLOACA.bajada,
    Tn = CLOACA.tunel;
  const room = ROOMS.tunel;
  Q.paint(D.x0, D.z0, D.x1, D.z1 + 0.1, 1);
  wb.setRoom(room);
  wb.tint = [0.5, 0.48, 0.45];
  stairs(ctx, (D.x0 + D.x1) / 2, Tn.y, D.z1, 'n', D.x1 - D.x0, D.n, D.rise, D.run, 'wallstone', { solidBelow: true });
  wb.tint = null;
  const wo = { sub: 1.6, aoH: 1.2, aoMin: 0.5, room, tint: [0.5, 0.48, 0.45] };
  wb.box('rock', D.x0 - 0.3, Tn.y - 0.4, D.z0, D.x0, -1.4, D.z1, { ...wo, faces: 'e', baseY: Tn.y });
  wb.box('rock', D.x1, Tn.y - 0.4, D.z0, D.x1 + 0.3, -1.4, D.z1, { ...wo, faces: 'w', baseY: Tn.y });
  wb.box('rock', D.x0 - 0.3, -1.4, D.z0, D.x1 + 0.3, -1.2, D.z1, { faces: 'b', ao: false, sub: 2, room, tint: [0.4, 0.38, 0.36] });
  col.add(D.x0, -1.4, D.z0, D.x1, -1.0, D.z1).cam = true;
  raices(ctx, (D.x0 + D.x1) / 2, -1.4, (D.z0 + D.z1) / 2, 3, 1.1, 9121, { room });
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ la galería
function tunel(ctx, Q, L) {
  const wb = ctx.wb,
    col = ctx.col;
  const Tn = CLOACA.tunel,
    D = CLOACA.bajada;
  const room = ROOMS.tunel;
  const { x0, x1, z0, z1, y, ys, c0, c1, cy } = Tn;
  Q.paint(x0, z0, x1, z1, 1);
  wb.setRoom(room);
  // los andenes y el canal (se puede meter uno en el agua: le llega al
  // tobillo)
  wb.box('flag', x0, y - 0.1, z0, c0, y, z1, { faces: 't', ao: false, sub: 2, tint: [0.48, 0.47, 0.42] });
  wb.box('flag', c1, y - 0.1, z0, x1, y, z1, { faces: 't', ao: false, sub: 2, tint: [0.46, 0.45, 0.4] });
  col.add(x0, y - 1, z0, c0, y, z1, 'floor').cam = true;
  col.add(c1, y - 1, z0, x1, y, z1, 'floor').cam = true;
  wb.box('mossstone', c0, cy - 0.1, z0, c1, cy, z1, { faces: 't', ao: false, sub: 2, tint: [0.42, 0.46, 0.38] });
  col.add(c0, cy - 1, z0, c1, cy, z1, 'floor').cam = true;
  wb.box('ashlar', c0 - 0.02, cy, z0, c0, y, z1, { faces: 'e', ao: false, sub: 2, tint: [0.4, 0.42, 0.38] });
  wb.box('ashlar', c1, cy, z0, c1 + 0.02, y, z1, { faces: 'w', ao: false, sub: 2, tint: [0.4, 0.42, 0.38] });
  // el bordillo de sillería de los andenes
  wb.box('ashlar', c0 - 0.22, y, z0, c0, y + 0.02, z1, { faces: 't', ao: false, sub: 3, tint: [0.56, 0.55, 0.5] });
  wb.box('ashlar', c1, y, z0, c1 + 0.18, y + 0.02, z1, { faces: 't', ao: false, sub: 3, tint: [0.56, 0.55, 0.5] });
  // (donde el canal se mete bajo el rellano de la sala: la boca del
  // conducto, negra)
  wb.box('black', c0, cy, z1 - 0.01, c1, y - 0.02, z1, { faces: 'n', ao: false, grime: false });
  if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [c0, z0, c1, z1], y: Tn.agua, flow: [0, 0.55], amp: 0.018, deep: 0x060908, sky: 0x10161a, glint: 0x7a90a0, light: [(c0 + c1) / 2, y + 3, z1 - 1], lightK: 0.5, drips: false });
  // los muros (abajo, la piedra mojada con su musgo) y la bóveda de medio
  // cañón
  const tint = [0.44, 0.45, 0.42];
  for (const [xa, xb, f] of [
    [x0 - 0.3, x0, 'e'],
    [x1, x1 + 0.3, 'w'],
  ]) {
    wb.box('mossstone', xa, cy - 0.05, z0, xb, y + 0.9, z1, { faces: f, sub: 1.6, aoH: 0.9, aoMin: 0.5, baseY: y, room, tint: [0.5, 0.54, 0.46] });
    wb.box('ashlar', xa, y + 0.9, z0, xb, ys, z1, { faces: f, sub: 1.6, ao: false, room, tint });
  }
  barrelVault(ctx, { x0, z0, x1, z1, ys, axis: 'z', mat: 'ashlar', tint: [0.4, 0.41, 0.39], room, impostTint: [0.5, 0.5, 0.46] });
  col.add(x0, ys + 1.6, z0, x1, -1.0, z1).cam = true;
  // el muro del norte (con la boca del conducto que trae el agua y su reja);
  // a poniente, la bajada
  wb.box('ashlar', D.x1, cy - 0.05, z0 - 0.3, x1, ys + 1.7, z0, { faces: 's', sub: 1.6, aoH: 1.2, baseY: y, room, tint });
  wb.box('ashlar', x0, -2.6, z0 - 0.3, D.x1, ys + 1.7, z0, { faces: 's', sub: 1.6, ao: false, room, tint });
  wb.box('black', c0, cy, z0 - 0.02, c1, cy + 0.6, z0 - 0.01, { faces: 's', ao: false, grime: false });
  for (let k = 0; k < 5; k++) {
    const bx = c0 + 0.1 + k * 0.22;
    wb.box('iron', bx - 0.02, cy, z0 + 0.02, bx + 0.02, cy + 0.62, z0 + 0.06, { ao: false, faces: 'tnsew' });
  }
  wb.box('iron', c0, cy + 0.56, z0 + 0.02, c1, cy + 0.62, z0 + 0.06, { ao: false, faces: 'tnsewb' });
  // lo de la galería: raíces por las juntas de la bóveda, regueros de agua
  // en los muros, los desagües de las calles (con sus chorros), un muerto en
  // el andén, huesos, cascotes
  const rr = new RNG(9131);
  for (const z of [-6.0, -1.2, 3.4, 7.2]) raices(ctx, (x0 + x1) / 2 + rr.range(-0.6, 0.6), ys + 1.55, z, 3, 1.2, 9132 + Math.round(z * 10), { room });
  for (const z of [-4.2, 1.6, 6.0]) {
    // (el desagüe de una calle: el caño en el muro de levante y el chorrito)
    wb.box('black', x1 - 0.01, y + 1.4, z - 0.18, x1, y + 1.7, z + 0.18, { faces: 'w', ao: false, grime: false });
    wb.box('ashlar', x1 - 0.12, y + 1.36, z - 0.24, x1, y + 1.4, z + 0.24, { ao: false, faces: 'tnsewb', tint: [0.5, 0.5, 0.46] });
    wb.box('water', x1 - 0.1, y - 0.0, z - 0.03, x1 - 0.06, y + 1.4, z + 0.03, { ao: false, faces: 'nsew', grime: false });
    wb.box('mossstone', x1 - 0.005, y - 0.05, z - 0.4, x1, y + 1.36, z + 0.4, { faces: 'w', ao: false, tint: [0.36, 0.46, 0.32] });
  }
  // lo verde de la galería: el musgo por los cantos de los andenes, junto al
  // agua; los helechos al pie de los muros y en las grietas; la hiedra que
  // cuelga de las juntas de la bóveda; los juncos en el canal; y, en lo más
  // oscuro, los hongos que dan luz (ya empieza aquí lo que hay en el Vergel)
  {
    const vr = new RNG(9161);
    for (let z = z0 + 0.6; z < z1 - 0.4; z += 1.25) {
      musgo(ctx, c0 - 0.3, y, z + vr.range(-0.3, 0.3), 0.32, 0.5, 9170 + Math.round(z * 10), { room, n: 5 });
      if (vr.chance(0.7)) musgo(ctx, c1 + 0.2, y, z + vr.range(-0.3, 0.3), 0.18, 0.45, 9270 + Math.round(z * 10), { room, n: 4 });
    }
    for (let z = z0 + 1.2; z < z1 - 0.6; z += 2.4) {
      const w = Math.round(z * 3) % 2 === 0;
      helecho(ctx, w ? x0 + 0.28 : x1 - 0.18, y, z + vr.range(-0.4, 0.4), vr.range(0.55, 0.9), 9370 + Math.round(z * 10), { room, n: 7 });
      if (vr.chance(0.5)) helecho(ctx, w ? x0 + 0.06 : x1 - 0.06, y + 0.9, z + vr.range(-0.5, 0.5), 0.4, 9470 + Math.round(z * 10), { room, n: 5 });
    }
    for (let z = z0 + 0.8; z < z1 - 0.4; z += 2.1) hiedra(ctx, (x0 + x1) / 2 + vr.range(-0.9, 0.9), ys + 1.5, z, vr.range(0.9, 2.0), 9570 + Math.round(z * 10), { room, hoja: 1.3 });
    for (const z of [-7.6, -2.4, 3.0, 7.8]) juncos(ctx, c0 + 0.12, cy, z, 0.18, 6, 9670 + Math.round(z * 10), { room, h: 0.9 });
    for (const [x, z, n] of [
      [x0 + 1.1, 2.9, 7],
      [x0 + 0.35, 5.6, 6],
      [x1 - 0.25, -4.6, 5],
      [x1 - 0.25, 1.2, 6],
      [x0 + 0.3, -6.4, 5],
    ])
      hongos(ctx, x, y, z, n, 9770 + Math.round(x * 10 + z), { room, luz: true, r: 0.22 });
    for (const [x, z] of [
      [x0 + 0.9, 3.6],
      [x1 - 0.4, -1.6],
      [x0 + 0.5, -6.2],
    ])
      ctx.lights.push({ x, y: y + 0.5, z, r: 0.3, g: 0.86, b: 0.78, radius: 3.4, intensity: 0.75, room });
  }
  bakeCorpse(wb, x0 + 0.6, y, 2.2, 1.5, 'sit', 'villager', 41);
  P.dropped(ctx, x0 + 0.9, y + 0.02, 3.1, 0.6, 'sword');
  P.bones(ctx, x0 + 0.7, y, -3.0, 6, 9141, 0.6);
  P.rubble(ctx, x0 + 0.6, y, 6.0, 5, 9142, 0.6);
  wb.setRoom(null);
  ctx.rats.push({ x: x0 + 0.8, y, z: -2.0, n: 2 }, { x: x1 - 0.4, y, z: 5.0, n: 2 });
  // la luz: casi ninguna (el farol); al fondo, el resplandor frío de la sala
  ctx.lights.push({ x: (x0 + x1) / 2, y: y + 1.6, z: z1 - 0.8, r: 0.5, g: 0.62, b: 0.82, radius: 7, intensity: 0.7, room });
  ctx.lights.push({ x: (x0 + x1) / 2, y: y + 1.2, z: -2.0, r: 0.3, g: 0.36, b: 0.38, radius: 6, intensity: 0.25, room });
  L.interact.push({ kind: 'examine', id: 'x_cloaca_muerto', text: 'cloacaMuerto', x: x0 + 0.9, y, z: 2.6, r: 1.3 });
}

// ------------------------------------------------------------------------ la sala de la luz
function sala(ctx, Q, L) {
  const wb = ctx.wb,
    col = ctx.col;
  const S = CLOACA.sala,
    Tn = CLOACA.tunel,
    C = CLOACA.canal,
    I = CLOACA.isla,
    O = CLOACA.ojo;
  const room = ROOMS.sala;
  const { x0, x1, z0, z1, y, top } = S;
  Q.paint(x0, z0, x1, z1, 1);
  wb.setRoom(room);
  const tint = [0.44, 0.45, 0.42];
  // ---------------------------------------------------------- el suelo, las acequias y la alberca
  // (el enlosado, por trozos: lo que no es agua ni isla)
  const water = [CLOACA.alberca, CLOACA.oeste, CLOACA.sur];
  const dry = restar([x0, z0, x1, z1], water);
  for (const [a, b, c, d] of dry) {
    wb.box('flag', a, y - 0.1, b, c, y, d, { faces: 't', ao: false, sub: 2, tint: [0.42, 0.42, 0.38] });
    col.add(a, y - 1, b, c, y, d, 'floor').cam = true;
  }
  for (const [a, b, c, d] of water) {
    // (donde se juntan la del oeste y la del sur, el lecho es de la del sur)
    const dd = a === CLOACA.oeste[0] && b === CLOACA.oeste[1] ? CLOACA.sur[1] : d;
    wb.box('mossstone', a, C.y - 0.1, b, c, C.y, dd, { faces: 't', ao: false, sub: 2, tint: [0.38, 0.42, 0.34] });
    col.add(a, C.y - 1, b, c, C.y, d, 'floor').cam = true;
    // los cantos de sillería (las caras de dentro de la acequia)
    wb.box('ashlar', a, C.y, b, c, y, b + 0.01, { faces: 's', ao: false, sub: 2, tint: [0.4, 0.42, 0.38] });
    wb.box('ashlar', a, C.y, d - 0.01, c, y, d, { faces: 'n', ao: false, sub: 2, tint: [0.4, 0.42, 0.38] });
    wb.box('ashlar', a, C.y, b, a + 0.01, y, d, { faces: 'e', ao: false, sub: 2, tint: [0.4, 0.42, 0.38] });
    wb.box('ashlar', c - 0.01, C.y, b, c, y, d, { faces: 'w', ao: false, sub: 2, tint: [0.4, 0.42, 0.38] });
  }
  if (ctx.waters) {
    const W = { y: C.agua, deep: 0x060a0a, sky: 0x141e26, glint: 0xa8c0dc, light: [I.x, -1.0, I.z], lightK: 0.7, amp: 0.022 };
    const A = CLOACA.alberca,
      Wo = CLOACA.oeste,
      Su = CLOACA.sur;
    ctx.waters.push({ ...W, shape: 'rect', r: [A[0] + 0.01, A[1] + 0.01, A[2] - 0.01, A[3] - 0.01], flow: [0.05, 0.25], amp: 0.04, drips: false, cascada: true });
    ctx.waters.push({ ...W, shape: 'rect', r: [Wo[0] + 0.01, A[3] - 0.01, Wo[2] - 0.01, Su[1] + 0.01], flow: [0, 0.5] });
    ctx.waters.push({ ...W, shape: 'rect', r: [Wo[0] + 0.01, Su[1] + 0.01, Su[2] - 0.01, Su[3] - 0.01], flow: [0.5, 0], spot: [I.x, Su[1] + 0.6, 2.2, 0.25] });
  }
  // ---------------------------------------------------------- los muros
  const muros = [
    [x0 - 0.3, z0, x0, z1, 'e'],
    [x0, z1, x1, z1 + 0.3, 'n'],
  ];
  for (const [a, b, c, d, f] of muros) {
    wb.box('mossstone', a, C.y - 0.05, b, c, y + 1.4, d, { faces: f, sub: 1.6, aoH: 1.2, aoMin: 0.45, baseY: y, room, tint: [0.48, 0.52, 0.44] });
    wb.box('ashlar', a, y + 1.4, b, c, top, d, { faces: f, sub: 1.8, ao: false, room, tint });
  }
  // el de levante, con el hueco de la galería del desagüe, que lleva el agua
  // al Vergel (sus jambas y su arco los pone el kit de las cloacas:
  // cloacas_hondas.js)
  {
    const g0 = DESAGUE.z - DESAGUE.h,
      g1 = DESAGUE.z + DESAGUE.h;
    const lo = { faces: 'w', sub: 1.6, aoH: 1.2, aoMin: 0.45, baseY: y, room, tint: [0.48, 0.52, 0.44] };
    wb.box('mossstone', x1, C.y - 0.05, z0, x1 + 0.3, y + 1.4, g0, { ...lo });
    wb.box('mossstone', x1, C.y - 0.05, g1, x1 + 0.3, y + 1.4, z1, { ...lo });
    wb.box('ashlar', x1, y + 1.4, z0, x1 + 0.3, top, g0, { faces: 'w', sub: 1.8, ao: false, room, tint });
    wb.box('ashlar', x1, y + 1.4, g1, x1 + 0.3, top, z1, { faces: 'w', sub: 1.8, ao: false, room, tint });
  }
  // el del norte: la boca de la galería (arriba, a poniente), el rellano y la
  // escalera; el resto, liso
  wb.box('mossstone', Tn.x1, y - 0.05, z0 - 0.3, x1, y + 1.4, z0, { faces: 's', sub: 1.6, aoH: 1.2, baseY: y, room, tint: [0.48, 0.52, 0.44] });
  wb.box('ashlar', Tn.x1, y + 1.4, z0 - 0.3, x1, top, z0, { faces: 's', sub: 1.8, ao: false, room, tint });
  // (encima de la boca de la galería, las enjutas de su arco: archRing)
  archRing(ctx, { axis: 'x', c: (Tn.x0 + Tn.x1) / 2, w: Tn.x1 - Tn.x0, y0: Tn.ys, rise: 1.6, ring: 0.32, t0: z0 - 0.3, t1: z0, top, clip: [x0, Tn.x1], mat: 'ashlar', spMat: 'ashlar', tint: [0.5, 0.5, 0.46], spTint: tint, room });
  // el rellano (macizo, del suelo de la sala al de la galería) con el
  // conducto por donde pasa el agua por debajo y sale en cascada
  const R = S.rellano;
  const cs = CLOACA.cascada;
  wb.box('ashlar', R[0], y, R[1], R[2], Tn.y, R[3], { faces: 'ew', sub: 1.6, aoH: 1.4, baseY: y, room, tint: [0.46, 0.47, 0.43] });
  wb.box('ashlar', R[0], y, R[3] - 0.01, cs.x0, Tn.y, R[3], { faces: 's', sub: 1.6, aoH: 1.4, baseY: y, room, tint: [0.46, 0.47, 0.43] });
  wb.box('ashlar', cs.x1, y, R[3] - 0.01, R[2], Tn.y, R[3], { faces: 's', sub: 1.6, aoH: 1.4, baseY: y, room, tint: [0.46, 0.47, 0.43] });
  wb.box('ashlar', cs.x0, y, R[3] - 0.01, cs.x1, cs.y0 - 0.05, R[3], { faces: 's', sub: 1.6, ao: false, room, tint: [0.36, 0.42, 0.36] });
  wb.box('ashlar', cs.x0, cs.y0 + 0.25, R[3] - 0.01, cs.x1, Tn.y, R[3], { faces: 's', sub: 1.6, ao: false, room, tint: [0.46, 0.47, 0.43] });
  // (la boca del conducto: su fondo negro, sus lados, su techo y su suelo
  // de piedra mojada)
  wb.box('black', cs.x0, cs.y0 - 0.05, R[3] - 0.2, cs.x1, cs.y0 + 0.25, R[3] - 0.19, { faces: 's', ao: false, grime: false });
  wb.box('mossstone', cs.x0, cs.y0 - 0.05, R[3] - 0.2, cs.x0 + 0.01, cs.y0 + 0.25, R[3], { faces: 'e', ao: false, tint: [0.34, 0.4, 0.32] });
  wb.box('mossstone', cs.x1 - 0.01, cs.y0 - 0.05, R[3] - 0.2, cs.x1, cs.y0 + 0.25, R[3], { faces: 'w', ao: false, tint: [0.34, 0.4, 0.32] });
  wb.box('mossstone', cs.x0, cs.y0 + 0.24, R[3] - 0.2, cs.x1, cs.y0 + 0.25, R[3], { faces: 'b', ao: false, tint: [0.3, 0.34, 0.28] });
  wb.box('mossstone', cs.x0, cs.y0 - 0.06, R[3] - 0.2, cs.x1, cs.y0 - 0.05, R[3], { faces: 't', ao: false, tint: [0.34, 0.4, 0.32] });
  col.add(R[0], y, R[1], R[2], Tn.y, R[3]);
  // (lo de encima del rellano: la galería sigue a su altura hasta el muro)
  wb.box('flag', R[0], Tn.y - 0.02, R[1], R[2], Tn.y, R[3], { faces: 't', ao: false, sub: 2, tint: [0.48, 0.47, 0.42] });
  // la escalera, bajando por el muro del norte hacia levante, con su pretil
  const E = S.esc;
  const rise = (Tn.y - y) / E.n;
  wb.tint = [0.42, 0.43, 0.41];
  stairs(ctx, E.x, y, E.z, 'w', E.w, E.n, rise, E.run, 'ashlar', { solidBelow: true });
  wb.tint = null;
  const pz = E.z + E.w / 2;
  for (let i = 0; i < E.n; i++) {
    const xa = E.x - E.run * (i + 1),
      xb = E.x - E.run * i;
    const yt = y + rise * (i + 1);
    wb.box('ashlar', xa, y, pz, xb, yt + 0.85, pz + 0.22, { faces: 'tsew', ao: false, sub: 2, tint: [0.42, 0.43, 0.42] });
    col.add(xa, y, pz, xb, yt + 1.0, pz + 0.22);
  }
  // (y en el borde del rellano, salvo donde cae el agua)
  for (const [a, b] of [
    [R[0], cs.x0 - 0.1],
    [cs.x1 + 0.1, R[2]],
  ]) {
    wb.box('ashlar', a, Tn.y, R[3], b, Tn.y + 0.85, R[3] + 0.22, { faces: 'tnsew', ao: false, sub: 2, tint: [0.42, 0.43, 0.42] });
    col.add(a, Tn.y, R[3], b, Tn.y + 1.0, R[3] + 0.22);
  }
  wb.box('ashlar', cs.x0 - 0.1, Tn.y, R[3] + 0.06, cs.x1 + 0.1, Tn.y + 0.4, R[3] + 0.22, { faces: 'tnsew', ao: false, tint: [0.42, 0.43, 0.42] });
  col.add(cs.x0 - 0.1, Tn.y, R[3], cs.x1 + 0.1, Tn.y + 1.0, R[3] + 0.22);
  // ---------------------------------------------------------- la reja de levante (la acequia del sur sale por ella)
  // (en la boca de la galería del desagüe: sus barrotes, de lado a lado; los
  // de encima del andén del sur, arrancados de abajo y doblados hacia fuera,
  // como cortinas: los dobló él; por ahí se pasa)
  {
    const bx = x1 + 0.15;
    const g0 = DESAGUE.z - DESAGUE.w / 2,
      g1 = DESAGUE.z + DESAGUE.w / 2;
    const yb = C.y,
      yt = y + 2.1 + DESAGUE.w / 2 - 0.12;
    const bar = (z, ytop) => wb.box('iron', bx - 0.025, yb, z - 0.025, bx + 0.025, ytop, z + 0.025, { ao: false, faces: 'tnsew' });
    // (la altura de cada barrote, bajo el arco de medio punto)
    const tope = (z) => y + 2.1 + Math.sqrt(Math.max(0, (DESAGUE.w / 2) ** 2 - (z - DESAGUE.z) ** 2)) - 0.08;
    const paso = [DESAGUE.z + 0.62, DESAGUE.z + 1.48];
    for (let z = g0 + 0.14; z < g1 - 0.05; z += 0.22) {
      if (z > paso[0] && z < paso[1]) continue;
      bar(z, tope(z));
    }
    ctx.col.add(bx - 0.06, yb, g0, bx + 0.06, yt, paso[0]);
    ctx.col.add(bx - 0.06, yb, paso[1], bx + 0.06, yt, g1);
    // los travesaños (el de abajo, roto donde se dobló)
    wb.box('iron', bx - 0.03, y + 1.9, g0 + 0.05, bx + 0.03, y + 1.96, g1 - 0.05, { ao: false, faces: 'tnsewb' });
    wb.box('iron', bx - 0.03, y + 0.3, g0 + 0.05, bx + 0.03, y + 0.36, paso[0], { ao: false, faces: 'tnsewb' });
    wb.box('iron', bx - 0.03, y + 0.3, paso[1], bx + 0.03, y + 0.36, g1 - 0.05, { ao: false, faces: 'tnsewb' });
    const curva = (z, dz, seed) => {
      const rr = new RNG(seed);
      let p = V(bx, tope(z), z);
      const n = 7;
      const ytop = tope(z);
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const q = V(bx + Math.sin(t * Math.PI) * 0.14 + rr.range(-0.01, 0.01), ytop - (ytop - yb - 0.45) * t, z + dz * Math.pow(t, 1.4));
        P.rod(ctx, p, q, 0.024, 0.024, 'iron', { segs: 5 });
        p = q;
      }
    };
    curva(paso[0] + 0.06, -0.38, 9161);
    curva(paso[0] + 0.28, -0.3, 9163);
    curva(paso[1] - 0.28, 0.3, 9164);
    curva(paso[1] - 0.06, 0.38, 9162);
  }
  // ---------------------------------------------------------- los pilares y sus arcos
  const pl = 0.45;
  const cap = -5.0;
  for (const [px, pz2] of CLOACA.pilares) {
    wb.box('ashlar', px - pl, y, pz2 - pl, px + pl, cap, pz2 + pl, { faces: 'nsew', sub: 1.6, aoH: 1.4, baseY: y, room, tint: [0.5, 0.5, 0.46] });
    wb.box('mossstone', px - pl - 0.01, y, pz2 - pl - 0.01, px + pl + 0.01, y + 1.1, pz2 + pl + 0.01, { faces: 'nsew', sub: 1.6, aoH: 1.0, baseY: y, room, tint: [0.46, 0.52, 0.42] });
    wb.box('ashlar', px - pl - 0.12, y, pz2 - pl - 0.12, px + pl + 0.12, y + 0.3, pz2 + pl + 0.12, { faces: 'tnsew', ao: false, room, tint: [0.48, 0.48, 0.44] });
    wb.box('ashlar', px - pl - 0.14, cap, pz2 - pl - 0.14, px + pl + 0.14, cap + 0.28, pz2 + pl + 0.14, { faces: 'tnsewb', ao: false, room, tint: [0.56, 0.55, 0.5] });
    col.add(px - pl - 0.12, y, pz2 - pl - 0.12, px + pl + 0.12, top, pz2 + pl + 0.12);
  }
  const ya = cap + 0.28;
  const [[ax0, az0], [ax1], [, az1]] = [CLOACA.pilares[0], CLOACA.pilares[1], CLOACA.pilares[2]];
  for (const zz of [az0, az1]) archRing(ctx, { axis: 'x', c: (ax0 + ax1) / 2, w: ax1 - ax0 - 2 * pl, y0: ya, rise: 2.3, ring: 0.42, t0: zz - pl, t1: zz + pl, top, mat: 'ashlar', spMat: 'ashlar', tint: [0.52, 0.52, 0.48], spTint: tint, room });
  for (const xx of [ax0, ax1]) archRing(ctx, { axis: 'z', c: (az0 + az1) / 2, w: az1 - az0 - 2 * pl, y0: ya, rise: 2.3, ring: 0.42, t0: xx - pl, t1: xx + pl, top, mat: 'ashlar', spMat: 'ashlar', tint: [0.52, 0.52, 0.48], spTint: tint, room });
  // ---------------------------------------------------------- el techo y el agujero
  for (const [a, b, c, d] of restar([x0, z0, x1, z1], [O])) {
    wb.box('ashlar', a, top, b, c, top + 0.1, d, { faces: 'b', ao: false, sub: 2.2, room, tint: [0.36, 0.37, 0.35] });
    col.add(a, top, b, c, -1.0, d).cam = true;
  }
  // (el boquete: la tierra y los cascotes de los cantos, de su techo a la
  // calle; los cantos mellados de las losas)
  const [ox0, oz0, ox1, oz1] = O;
  const er = { sub: 1.2, ao: false, room };
  wb.box('dirt', ox0 - 0.3, top, oz0, ox0, -0.05, oz1, { ...er, faces: 'e', tint: [0.36, 0.32, 0.28] });
  wb.box('dirt', ox1, top, oz0, ox1 + 0.3, -0.05, oz1, { ...er, faces: 'w', tint: [0.36, 0.32, 0.28] });
  wb.box('dirt', ox0, top, oz0 - 0.3, ox1, -0.05, oz0, { ...er, faces: 's', tint: [0.36, 0.32, 0.28] });
  wb.box('dirt', ox0, top, oz1, ox1, -0.05, oz1 + 0.3, { ...er, faces: 'n', tint: [0.36, 0.32, 0.28] });
  const rr = new RNG(9151);
  for (let k = 0; k < 22; k++) {
    const t = k / 22;
    const side = k % 4;
    const u = rr.range(0.1, 0.9);
    const px = side === 0 ? ox0 + rr.range(0, 0.25) : side === 1 ? ox1 - rr.range(0, 0.25) : ox0 + (ox1 - ox0) * u;
    const pz2 = side === 2 ? oz0 + rr.range(0, 0.25) : side === 3 ? oz1 - rr.range(0, 0.25) : oz0 + (oz1 - oz0) * u;
    P.roughStone(ctx, px, top - rr.range(0.05, 0.3), pz2, rr.range(0.14, 0.32), 9152 + k, { room, tint: [0.26, 0.25, 0.24] });
    void t;
  }
  // la casa de encima, por dentro: sus muros (tiznados) del suelo de la
  // calle al alero (el desván, las tejas y el agujero del tejado los pone
  // su constructor)
  {
    const H = CASA;
    const ix0 = H.x0 + H.t,
      ix1 = H.x1 - H.t,
      iz0 = H.z0 + H.t,
      iz1 = H.z1 - H.t;
    const so = { sub: 2, ao: false, room, tint: [0.3, 0.27, 0.25] };
    wb.box('plaster', ix0 - 0.05, -0.06, iz0, ix0, H.h, iz1, { ...so, faces: 'e' });
    wb.box('plaster', ix1, -0.06, iz0, ix1 + 0.05, H.h, iz1, { ...so, faces: 'w' });
    wb.box('plaster', ix0, -0.06, iz0 - 0.05, ix1, H.h, iz0, { ...so, faces: 's' });
    wb.box('plaster', ix0, -0.06, iz1, ix1, H.h, iz1 + 0.05, { ...so, faces: 'n' });
    // (lo que queda del suelo de la casa, alrededor del boquete: tablas
    // quemadas que asoman sobre el agujero)
    for (let k = 0; k < 9; k++) {
      const a = rr.range(0, 1);
      const sd = k % 4;
      const px = sd < 2 ? (sd ? ox1 + 0.2 : ox0 - 0.2) : ox0 + (ox1 - ox0) * a;
      const pz2 = sd >= 2 ? (sd === 3 ? oz1 + 0.2 : oz0 - 0.2) : oz0 + (oz1 - oz0) * a;
      const L2 = rr.range(0.8, 1.6);
      wb.push();
      wb.translate(px, -0.04, pz2);
      wb.rotateY(sd < 2 ? 0 : Math.PI / 2);
      wb.rotateZ((sd % 2 ? -1 : 1) * rr.range(0.05, 0.25) * (sd < 2 ? 1 : -1));
      wb.box('wooddark', sd % 2 ? -L2 : 0, -0.03, -0.1, sd % 2 ? 0 : L2, 0.03, 0.1, { ao: false, faces: 'tnsewb', room, tint: [0.18, 0.16, 0.15] });
      wb.pop();
    }
  }
  // ---------------------------------------------------------- la isla de la luz
  // (los escombros de la casa, con su tierra, levantados sobre el enlosado;
  // lo verde, donde cae la luz)
  const iy = I.y;
  const islas = [
    [-11.0, 15.2, -5.0, 20.8],
    [-10.4, 14.6, -5.6, 21.4],
    [-11.6, 15.8, -4.4, 20.2],
  ];
  // (la colisión, por cajones; lo que se ve, un montecillo de borde
  // irregular con su talud)
  for (const [a, b, c, d] of islas) col.add(a, y, b, c, iy, d, 'floor').cam = true;
  montecillo(ctx, I.x, I.z, y, iy, 3.05, 9160, { room, sx: 1.0, sz: 1.05, talud: 0.6 });
  // (el musgo, que lo cubre casi todo)
  musgo(ctx, I.x, iy, I.z, 2.8, 2.6, 9161, { room, n: 70 });
  // las vigas quemadas que cayeron con el suelo, cubiertas de verde
  for (const [bx, bz, r, L2, s] of [
    [-10.2, 17.2, 0.5, 3.0, 9162],
    [-6.2, 20.4, -0.9, 2.6, 9163],
    [-5.4, 15.9, 0.35, 2.2, 9164],
  ]) {
    wb.push();
    wb.translate(bx, iy + 0.12, bz);
    wb.rotateY(r);
    wb.rotateZ(0.12);
    wb.box('wooddark', -L2 / 2, -0.12, -0.13, L2 / 2, 0.12, 0.13, { ao: false, faces: 'tnsewb', room, tint: [0.2, 0.18, 0.16] });
    wb.pop();
    musgo(ctx, bx, iy + 0.2, bz, 0.5, 0.25, s, { room, n: 4 });
  }
  P.rubble(ctx, -10.6, iy, 19.8, 6, 9165, 0.7, { room, tint: [0.34, 0.33, 0.31] });
  P.rubble(ctx, -5.0, iy, 17.6, 5, 9166, 0.6, { room, tint: [0.34, 0.33, 0.31] });
  // (y alrededor, los cascotes que rodaron del montón)
  const cr = new RNG(9167);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + cr.range(-0.15, 0.15);
    const d = 3.5 + cr.range(-0.2, 0.4);
    P.roughStone(ctx, I.x + Math.cos(a) * d, y + 0.02, I.z + Math.sin(a) * d * 1.05, cr.range(0.14, 0.32), 9168 + k, { room, tint: [0.32, 0.31, 0.29] });
  }
  // los helechos, la hierba y las flores blancas (más, cuanto más luz)
  const fr = new RNG(9171);
  for (let k = 0; k < 16; k++) {
    const a = fr.range(0, Math.PI * 2),
      d = fr.range(1.0, 3.1);
    const px = I.x + Math.cos(a) * d * 1.05,
      pz2 = I.z + Math.sin(a) * d;
    if (Math.hypot(px - CLOACA.desfigurado.x, pz2 - CLOACA.desfigurado.z) < 1.0) continue;
    helecho(ctx, px, iy, pz2, fr.range(0.7, 1.25), 9172 + k, { room });
  }
  for (let k = 0; k < 26; k++) {
    const a = fr.range(0, Math.PI * 2),
      d = fr.range(0.2, 3.0);
    hierba(ctx, I.x + Math.cos(a) * d, iy, I.z + Math.sin(a) * d, 0.35, 12, 9190 + k, { room, h: d < 1.4 ? 0.5 : 0.35 });
  }
  for (let k = 0; k < 18; k++) {
    const a = fr.range(0, Math.PI * 2),
      d = fr.range(0.4, 2.2);
    flores(ctx, I.x + Math.cos(a) * d, iy, I.z + Math.sin(a) * d, 0.3, 6, 9220 + k, { room });
  }
  // la higuera, que crece hacia el agujero
  higuera(ctx, -9.7, iy, 16.4, 2.9, 9241, { room, lean: [0.14, 0.16] });
  // ---------------------------------------------------------- lo verde de alrededor
  // (en las orillas, junto al agua: juncos, helechos, musgo; en los pies de
  // los pilares y de los muros, musgo)
  for (const [x, z, s] of [
    [-12.0, 12.2, 9251],
    [-11.6, 23.9, 9252],
    [-6.0, 25.3, 9253],
    [-2.4, 25.6, 9254],
    [-15.4, 15.6, 9255],
    [-15.3, 21.0, 9256],
  ]) {
    juncos(ctx, x, y, z, 0.35, 9, s, { room });
    musgo(ctx, x, y, z, 0.6, 0.5, s + 100, { room, n: 7 });
  }
  for (const [x, z] of [
    [-15.4, 13.0],
    [-15.5, 18.4],
    [-1.2, 12.0],
    [-0.8, 19.0],
    [-4.8, 26.2],
    [-12.2, 26.3],
  ]) {
    helecho(ctx, x, y, z, 0.8, 9300 + Math.round(x * 10 + z), { room });
    musgo(ctx, x, y, z, 0.7, 0.5, 9400 + Math.round(z * 10), { room, n: 6 });
  }
  for (const [px, pz2] of CLOACA.pilares) musgo(ctx, px, y, pz2, 0.9, 0.9, 9500 + Math.round(px * 7 + pz2), { room, n: 9 });
  // la hiedra que baja por los pilares, de sus capiteles; los hongos que dan
  // luz en los rincones a oscuras; más helechos al pie del muro del sur
  {
    const vr = new RNG(9531);
    const pl0 = 0.45;
    for (const [px, pz2] of CLOACA.pilares)
      for (let k = 0; k < 6; k++) {
        const sd = k % 4;
        const dir = sd === 0 ? [1, 0] : sd === 1 ? [-1, 0] : sd === 2 ? [0, 1] : [0, -1];
        const u = vr.range(-0.35, 0.35);
        hiedra(ctx, px + dir[0] * (pl0 + 0.02) + (dir[0] ? 0 : u), -5.0 + 0.1, pz2 + dir[1] * (pl0 + 0.02) + (dir[1] ? 0 : u), vr.range(1.4, 3.2), 9540 + Math.round(px * 3 + pz2) * 7 + k, { room, dir, hoja: 1.4 });
      }
    for (const [x, z, n] of [
      [x0 + 0.5, z1 - 0.6, 8],
      [x1 - 0.5, z1 - 0.6, 7],
      [x1 - 0.5, z0 + 1.6, 6],
      [-4.6, z1 - 0.5, 6],
      [-11.0, z1 - 0.5, 6],
      [x1 - 0.5, 17.0, 5],
    ])
      hongos(ctx, x, y, z, n, 9590 + Math.round(x * 10 + z), { room, luz: true, r: 0.3 });
    for (const [x, z] of [
      [x0 + 0.6, z1 - 0.8],
      [x1 - 0.6, z1 - 0.8],
      [x1 - 0.6, z0 + 1.8],
    ])
      ctx.lights.push({ x, y: y + 0.5, z, r: 0.3, g: 0.86, b: 0.78, radius: 3.6, intensity: 0.8, room });
    for (let k = 0; k < 8; k++) helecho(ctx, -14.0 + k * 1.9 + vr.range(-0.3, 0.3), y, z1 - 0.45, vr.range(0.7, 1.1), 9620 + k, { room });
  }
  // la hiedra que baja por el agujero, y las raíces del techo
  const hr = new RNG(9601);
  for (let k = 0; k < 44; k++) {
    const sd = k % 4;
    const u = hr.range(0.05, 0.95);
    const px = sd === 0 ? ox0 + 0.05 : sd === 1 ? ox1 - 0.05 : ox0 + (ox1 - ox0) * u;
    const pz2 = sd === 2 ? oz0 + 0.05 : sd === 3 ? oz1 - 0.05 : oz0 + (oz1 - oz0) * u;
    const dir = sd === 0 ? [1, 0] : sd === 1 ? [-1, 0] : sd === 2 ? [0, 1] : [0, -1];
    hiedra(ctx, px, hr.range(-0.4, 1.2), pz2, hr.range(2.4, 6.4), 9602 + k, { room, dir, hoja: 1.4 });
  }
  for (const [x, z] of [
    [-14.0, 11.4],
    [-2.0, 11.0],
    [-1.6, 25.6],
    [-14.6, 25.4],
    [-8.0, 12.0],
    [-13.6, 18.6],
  ])
    raices(ctx, x, top, z, 4, 1.8, 9650 + Math.round(x * 3 + z), { room });
  // ---------------------------------------------------------- lo suyo
  // (contra el pilar del nordeste: su yacija de trapos, la manta, la
  // escudilla, el cántaro, el tarro con las flores que coge, el cayado; y en
  // la piedra, lo que ha rayado: HERMOSA, una vez y otra, y MÍRALA)
  {
    const [px, pz2] = CLOACA.pilares[1];
    const bx = px - 0.3,
      bz = pz2 + 1.3;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      wb.push();
      wb.translate(bx + Math.cos(a) * 0.45, y + 0.06, bz + Math.sin(a) * 0.7);
      wb.rotateY(a + 0.4);
      wb.box(k % 2 ? 'burlap' : 'clothDark', -0.32, -0.06, -0.22, 0.32, 0.08 + (k % 3) * 0.04, 0.22, { ao: false, room, tint: [0.56, 0.5, 0.42] });
      wb.pop();
    }
    wb.box('burlap', bx - 0.5, y + 0.12, bz - 0.85, bx + 0.45, y + 0.16, bz + 0.85, { ao: false, faces: 'tnsew', room, tint: [0.5, 0.44, 0.36] });
    wb.cylinder('wooddark', bx + 0.75, y, bz - 0.55, 0.08, 0.11, 0.06, 10, { ao: false, room, capBot: true, tint: [0.7, 0.6, 0.48] });
    P.jar(ctx, bx + 0.85, y, bz + 0.3, 0.75, { room, tint: [0.6, 0.44, 0.32] });
    // el tarro de las flores
    P.jar(ctx, bx + 0.7, y, bz + 0.95, 0.42, { room, collide: false, tint: [0.66, 0.5, 0.36] });
    flores(ctx, bx + 0.7, y + 0.24, bz + 0.95, 0.04, 5, 9701, { room, h: 0.8 });
    // el cayado, apoyado en el pilar
    P.rod(ctx, V(px - pl - 0.35, y, pz2 + 0.2), V(px - pl - 0.02, y + 1.6, pz2 + 0.1), 0.02, 0.017, 'timber', { room, segs: 6 });
    // lo rayado en la piedra (en la cara del pilar que mira a la isla y en
    // el muro del norte, junto a la escalera)
    const rasca = (mat, x, yy, z, ry, w, h) => wb.geometry(mat, new THREE.PlaneGeometry(w, h), new THREE.Matrix4().compose(V(x, yy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0.02)), V(1, 1, 1)), { ao: false, grime: false, room });
    rasca('scratchHermosa', px - pl - 0.012, y + 1.6, pz2, -Math.PI / 2, 0.85, 0.2);
    rasca('scratchHermosa2', px - pl - 0.012, y + 1.2, pz2 + 0.05, -Math.PI / 2, 0.8, 0.32);
    rasca('scratchMirala', px - 0.05, y + 1.7, pz2 + pl + 0.012, 0, 0.62, 0.18);
    const [qx, qz] = CLOACA.pilares[0];
    rasca('scratchHermosa', qx + pl + 0.012, y + 1.5, qz + 0.1, Math.PI / 2, 0.85, 0.2);
    rasca('scratchHermosa2', -4.6, y + 1.9, z0 + 0.012, 0, 0.9, 0.36);
    rasca('scratchHermosa', -2.4, y + 1.3, z0 + 0.012, 0, 0.85, 0.2);
    // las rayas de las noches, en el pilar (una por noche, de cinco en cinco)
    for (let k = 0; k < 23; k++) {
      const g5 = Math.floor(k / 5),
        i5 = k % 5;
      const zz = pz2 - 0.35 + g5 * 0.16 + i5 * 0.022;
      if (i5 === 4) wb.box('bone', px - pl - 0.008, y + 0.75, zz - 0.09, px - pl - 0.004, y + 0.77, zz + 0.0, { ao: false, faces: 'w', grime: false, tint: [0.62, 0.64, 0.6] });
      else wb.box('bone', px - pl - 0.008, y + 0.66, zz - 0.004, px - pl - 0.004, y + 0.86, zz + 0.004, { ao: false, faces: 'w', grime: false, tint: [0.62, 0.64, 0.6] });
    }
    col.add(bx - 0.6, y, bz - 0.9, bx + 0.6, y + 0.25, bz + 0.9);
    L.interact.push({ kind: 'examine', id: 'x_hermosa', text: 'hermosaRayas', x: px - pl - 0.5, y, z: pz2, r: 1.2 });
    L.interact.push({ kind: 'examine', id: 'x_yacija', text: 'yacijaDesfigurado', x: bx, y, z: bz, r: 1.3 });
  }
  // ---------------------------------------------------------- la luz
  // (la luna, por el agujero: la isla y él, fríos y claros; un rebote suave
  // por los muros; el haz, de lo alto del tejado quemado a la isla)
  const D = CLOACA.desfigurado;
  ctx.lights.push({ x: I.x, y: iy + 3.4, z: I.z, r: 0.64, g: 0.74, b: 0.98, radius: 8.5, intensity: 2.8, room });
  ctx.lights.push({ x: I.x - 0.2, y: iy + 0.9, z: I.z + 0.2, r: 0.6, g: 0.72, b: 0.94, radius: 5, intensity: 1.2, room });
  ctx.lights.push({ x: I.x, y: iy + 6.5, z: I.z, r: 0.5, g: 0.6, b: 0.82, radius: 13, intensity: 0.7, room });
  ctx.lights.push({ x: -13.9, y: -7.5, z: 11.6, r: 0.45, g: 0.56, b: 0.7, radius: 5, intensity: 0.5, room });
  ctx.lights.push({ x: -8.0, y: -1.8, z: 18.0, r: 0.5, g: 0.6, b: 0.8, radius: 6, intensity: 0.9, room });
  // (la luz de la luna en su cara: no parpadea, y se la lleva antes que a
  // otra si hay pocas)
  if (ctx.dynLights) ctx.dynLights.push({ x: D.x + 0.25, y: iy + 2.6, z: D.z + 0.1, intensity: 2.4, range: 5.5, color: 0xbfd2f4, flicker: 0, priority: 3 });
  if (ctx.shafts) {
    ctx.shafts.push({ a: [-7.85, CASA.h + 1.4, 17.9], b: [D.x + 0.05, iy + 0.05, D.z], w: 2.6, color: 0xa8bedc, k: 3.2 });
    ctx.shafts.push({ a: [-8.4, CASA.h + 0.8, 18.4], b: [-8.9, iy + 0.05, 17.6], w: 1.5, color: 0x8ea4c8, k: 2.4 });
    ctx.shafts.push({ a: [-7.4, CASA.h + 1.0, 17.4], b: [-6.9, iy + 0.05, 18.9], w: 1.1, color: 0x9fb4d4, k: 1.8 });
  }
  wb.setRoom(null);
  // ---------------------------------------------------------- él
  L.enemies.push({ type: 'desfigurado', x: D.x, y: iy, z: D.z, yaw: D.yaw, idle: 'cielo', id: 'npc_desfigurado' });
  L.interact.push({ kind: 'npc', id: 't_desfigurado', npc: 'desfigurado', label: 'Hablar', x: D.x, y: iy, z: D.z, r: 2.6 });
}

// Un rectángulo menos otros (en trozos que no se pisan).
function restar(r, huecos) {
  let out = [r];
  for (const h of huecos) {
    const next = [];
    for (const [a, b, c, d] of out) {
      const [h0, h1, h2, h3] = h;
      if (h0 >= c || h2 <= a || h1 >= d || h3 <= b) {
        next.push([a, b, c, d]);
        continue;
      }
      if (h1 > b) next.push([a, b, c, h1]);
      if (h3 < d) next.push([a, h3, c, d]);
      if (h0 > a) next.push([a, Math.max(b, h1), h0, Math.min(d, h3)]);
      if (h2 < c) next.push([h2, Math.max(b, h1), c, Math.min(d, h3)]);
    }
    out = next;
  }
  return out;
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const B = CLOACA.bodega,
    D = CLOACA.bajada,
    Tn = CLOACA.tunel,
    S = CLOACA.sala;
  L.zones.push(
    { id: 'cloaca_bodega', rects: [[B.x0, B.z0, B.x1, B.z1, B.y - 0.6, -1.1]], atmo: 'cellar', room: ROOMS.bodega },
    { id: 'cloaca', rects: [[D.x0, D.z0, D.x1, D.z1, Tn.cy - 0.6, -1.1], [Tn.x0, Tn.z0, Tn.x1, Tn.z1, Tn.cy - 0.6, -1.1]], atmo: 'cloaca', room: ROOMS.tunel },
    { id: 'cloaca_luz', rects: [[S.x0, S.z0, S.x1, S.z1, S.y - 0.9, -1.1]], atmo: 'cloaca_luz', room: ROOMS.sala }
  );
  L.map.push(
    { id: 'cloaca_bodega', r: [B.x0, B.z0, B.x1, B.z1], level: 'cloaca' },
    { id: 'cloaca', r: [D.x0, D.z0, D.x1, D.z1], level: 'cloaca' },
    { id: 'cloaca', r: [Tn.x0, Tn.z0, Tn.x1, Tn.z1], level: 'cloaca' },
    { id: 'cloaca_luz', r: [S.x0, S.z0, S.x1, S.z1], level: 'cloaca' }
  );
}

void M;
void solid;
