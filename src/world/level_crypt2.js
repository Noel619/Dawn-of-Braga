// La cripta honda: lo que hay bajo la cripta de la Sé (el diseño, en
// PLAN_CRIPTA_HONDA.md).
//
// Tres épocas, cada una más honda que la anterior:
//  - San Martín de Dumio (sueva). Del templo romano se baja a la Sala de los
//    Obispos, un bosque de columnas con bóvedas de arista y los sepulcros de
//    los obispos de Braga; al oeste, por tres arcos, la cripta-iglesia del
//    santo (nave y naves laterales, y el altar al norte, como la catedral de
//    arriba): la Capilla de San Martín, donde se descansa; el osario; y, en
//    el eje de la antesala, el Pórtico de los Velados.
//  - Las necrópolis. Bajo la sala de los obispos, las Catacumbas de la Sé:
//    galerías cortas con nichos, cubículos, un cruce de huesos y el
//    lucernario, con el oratorio de San Pedro de Rates. Más abajo, la
//    catacumba de los Inocentes: su pila y el Relicario de San Martín (la
//    Cámara de la Garra). Y al este, por el sepulcro del arzobispo, la cripta
//    de los Mártires: el martyrium, la pila (abajo) y la sacristía.
//  - Bracara Augusta. La basílica del dios sin nombre, la Antesala del Dios
//    Ignoto: la tribuna (adonde da el pórtico), la escalinata, la nave, el
//    estrado y la puerta, y bajo ella el Pozo de los Condenados.
// Y la Confesión, al fondo del osario: la reja que da a la cisterna.
//
// La puerta (game/crypt.js) pide cuatro cosas: los dos Velados vencidos, la
// Garra de Oro en su cerradura, los cinco círculos de sangre llenos (las tres
// pilas vaciadas: su sangre llora por las cabezas del dintel) y el incensario
// del estrado encendido con el incienso negro.
//
// La planta es una lista de rectángulos transitables, cada uno con su suelo y
// su arranque (LAYOUT): de ella salen los muros (carve), la altura del suelo
// para la navegación (cryptFloorY), las zonas y el mapa. Las bóvedas, los
// arcos, las columnas y lo demás los pone cada sala.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { stairs, archRing, barrelVault, rampVault, groinVaults, lunette, pilaster, subtractRects } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';

const Y = -7; // la cripta de arriba (el templo, el osario, el sepulcro)
const Y1 = -8.2; // San Martín: la sala de los obispos, su cripta, la tribuna
const YC = -10.6; // las catacumbas de la Sé (y la pila de los mártires)
const YI = -12.7; // los Inocentes
const AY = -10; // la cisterna (y el estrado de la puerta)
const DY = -13; // el suelo de la antesala
const PY = -16; // el pozo de los condenados
const ROOM = 'crypt';
const CT = [0.74, 0.74, 0.7], // muros
  VT = [0.68, 0.68, 0.65], // bóvedas
  AT = [0.88, 0.85, 0.79]; // arcos, pilastras y columnas
const ST = [0.85, 0.82, 0.78]; // huesos
const OT = [0.68, 0.64, 0.58]; // la sillería de San Martín
const RK = [0.62, 0.57, 0.5]; // la roca de las catacumbas
const DT = [0.7, 0.66, 0.62]; // la sillería romana de la antesala

export const DEEP = {
  Y,
  Y1,
  YC,
  YI,
  AY,
  DY,
  PY,
  // la Confesión, al fondo del osario, y su ventana en el muro de la cisterna
  confessio: { x0: -4, z0: -136.4, x1: 4, z1: -133.5, win: { x0: -1.2, x1: 1.2, y0: AY + 3.6, y1: AY + 5.0 } },
  // la Sala de los Obispos: tramos de 5 m (bóvedas de arista sobre columnas)
  obispos: { x0: -62, z0: -136, x1: -22, z1: -106, YS: Y1 + 3.2, rise: 2.5 },
  // el umbral del templo: un rellano a -7 y cuatro peldaños
  landing: { x0: -24.5, z0: -121.5, x1: -22, z1: -114 },
  // la cripta de San Martín: nave (con la capilla al norte) y naves laterales
  martin: { x0: -84, z0: -167, x1: -64, z1: -119, rows: [-78, -70], cols: [-161, -155, -149, -143, -137, -131, -125], YC: Y1 + 2.2, YS: Y1 + 4.8 },
  chapel: { x0: -78, z0: -175, x1: -70, z1: -167, y: Y1 + 0.6 },
  // donde reza Dom Paio: a los pies del sepulcro del santo, de espaldas a la
  // nave (game/paio.js)
  paio: { x: -73.7, z: -167.9 },
  osario: { x0: -94, z0: -150, x1: -85, z1: -142 },
  // el Pórtico de los Velados: de la nave lateral a la tribuna, en el eje
  portal: { z: -152, w: 5, y0: Y1 + 1.9, rise: 2.5 },
  // la antesala: la tribuna, la escalinata, la nave, el estrado y la puerta
  hall: { x0: -62, z0: -167, x1: -16, z1: -137, YC: -6.1, YS: -4.6, rows: [-158.5, -145.5], cols: [-54, -47, -40, -33, -26, -19] },
  terrace: { x0: -62, x1: -56 },
  stair: { x0: -56, x1: -48.8, z: -152, w: 9, n: 16 },
  dais: { x0: -24, z0: -160, x1: -16, z1: -144 },
  daisStair: { x0: -29, x1: -24, z: -152, w: 6, n: 10 },
  door: { x: -16, z: -152, w: 5, h: 5.2 },
  censer: { x: -22.4, z: -152 },
  // el pozo de los condenados y su escalera (desde la nave lateral del norte)
  pozo: { x0: -48, z0: -194, x1: -24, z1: -174 },
  pozoStair: { x0: -38.5, x1: -34.5, z0: -171.5, z1: -167, n: 10 },
  // las tres pilas (la taza, en el centro de cada rectángulo): la de los
  // Inocentes, la de los Mártires y la de los Condenados
  font1: { x0: -76, z0: -108, x1: -66, z1: -99 },
  font2: { x0: 22.5, z0: -159, x1: 34.5, z1: -147 },
  font3: { x0: -42, z0: -190, x1: -30, z1: -178 },
  // el relicario de San Martín (la Cámara de la Garra) y su rastrillo
  claw: { x0: -96, z0: -103, x1: -81, z1: -85, y: YI, gate: { x: -80.5, z0: -95, z1: -92 } },
  // la cripta de los mártires (su tramo central, en el eje de la puerta del
  // sepulcro: -120), su pila y la sacristía del arzobispo
  martyr: { x0: 22, z0: -137.5, x1: 35, z1: -107.5 },
  fontHall: { x0: 22, z0: -164.5, x1: 35, z1: -141.5 },
  sacristy: { x0: 23, z0: -107, x1: 34, z1: -95.5, door: { x: 28.5, z: -107.25, w: 2.5 } },
  // los Velados, a los lados de la puerta
  guards: [
    { x: -21, z: -155.6 },
    { x: -21, z: -148.4 },
  ],
};

// ------------------------------------------------------------ la planta
// Cada espacio: r [x0, z0, x1, z1], y (suelo), top (arranque de la bóveda o
// techo llano). Opciones:
//  - ghost: ya existe (lo levanta otro): no se construye, pero cuenta para no
//    cerrar el paso hacia él.
//  - stair: { axis, a0, a1, y0, y1 }: una escalera (su suelo va de y0 en a0
//    a y1 en a1; los peldaños los pone la sala); sin tabicas a los lados.
//  - arch: un vano con arco: sus jambas llegan hasta 'arch' (el arranque) y
//    no hay cabeceras entre él y sus vecinos (el arco y sus enjutas, aparte).
//  - walls: false: sin muros (sus jambas las pone otro, como el muro del
//    templo, del que sólo se pinta el hueco).
//  - base: una plataforma maciza desde 'base' (la tribuna sobre la nave).
//  - ceil, floor, mat, tint, floorMat, floorTint, ceilMat, ceilTint, zone.
//  - niches: los nichos de sus muros ('loculi', 'small', 'bones').
function layout() {
  const R = [];
  const add = (id, r, y, top, o = {}) => {
    const g = { id, r, y, top, ...o };
    R.push(g);
    return g;
  };
  const D = DEEP;
  const ash = { mat: 'ashlar', tint: OT };
  const rock = { mat: 'rock', tint: RK };

  // --- lo que ya existe (level_sacred.js)
  add('osarioViejo', [-2.5, -133, 2.5, -110], Y, Y + 3.8, { ghost: true });
  add('templo', [-19, -132, -3.5, -112], Y, Y + 5.65, { ghost: true });
  add('llegada', [-7, -110, 7, -97], Y, Y + 5.8, { ghost: true });
  add('sepulcro', [3.5, -128, 16, -112], Y, Y + 3.6, { ghost: true });
  add('cisterna', [-15, -167, 15, -137], AY, AY + 8.8, { ghost: true });

  // --- la Confesión (la boca del osario y la cámara)
  const CF = D.confessio;
  add('confesionBoca', [-1.5, -133.5, 1.5, -133], Y, Y + 3.2, { ...ash, zone: 'confesion' });
  add('confesion', [CF.x0, CF.z0, CF.x1, CF.z1], Y, Y + 3.3, { ...ash, ceil: false, zone: 'confesion' });

  // --- la Sala de los Obispos y el umbral del templo
  const OB = D.obispos,
    LD = D.landing;
  add('obispos', [OB.x0, OB.z0, OB.x1, OB.z1], Y1, OB.YS, { ...ash, ceil: false, zone: 'obispos' });
  add('obisposRellano', [LD.x0, LD.z0, LD.x1, LD.z1], Y, OB.YS, { ...ash, ceil: false, base: Y1, zone: 'obispos' });
  add('obisposPeldanos', [-26.3, -120.5, LD.x0, -116.5], Y1, OB.YS, { ceil: false, floor: false, stair: { axis: 'x', a0: -26.3, a1: LD.x0, y0: Y1, y1: Y }, zone: 'obispos' });
  add('temploPaso', [-22, -119, -19.5, -116.5], Y, Y + 2.2, { ...ash, ceil: false, arch: Y + 2.2, zone: 'obispos' });
  add('temploPuerta', [-19.5, -119, -19, -116.5], Y, Y + 2.2, { ceil: false, walls: false, zone: 'roman' });
  // los tres arcos a la cripta de San Martín
  for (const [c, w] of ARCADE) add('obisposArco', [-64, c - w / 2, -62, c + w / 2], Y1, Y1 + 1.6, { ...ash, ceil: false, arch: Y1 + 1.6, zone: 'obispos' });
  // la bajada a las catacumbas
  add('obisposBajada', [-36, -106, -33, -102.4], YC, Y1 + 2.2, { ...rock, ceil: false, floor: false, arch: Y1 + 2.2, stair: { axis: 'z', a0: -106, a1: -102.4, y0: Y1, y1: YC }, zone: 'catacumbas' });

  // --- la cripta de San Martín, su capilla, el osario y el pórtico
  const MB = D.martin,
    CH = D.chapel,
    OS = D.osario;
  add('martin', [MB.x0, MB.z0, MB.x1, MB.z1], Y1, MB.YS, { ...ash, ceil: false, zone: 'martin' });
  add('capilla', [CH.x0, CH.z0, CH.x1, CH.z1], CH.y, MB.YS, { ...ash, ceil: false, base: Y1, zone: 'capilla_martin' });
  add('capillaPeldanos', [-77, -167, -71, -166.1], Y1, MB.YS, { ceil: false, floor: false, stair: { axis: 'z', a0: -166.1, a1: -167, y0: Y1, y1: CH.y }, zone: 'martin' });
  add('osario', [OS.x0, OS.z0, OS.x1, OS.z1], Y1, Y1 + 2.6, { mat: 'skulls', tint: ST, ceil: false, zone: 'osario_martin' });
  add('osarioPuerta', [OS.x1, -147.6, MB.x0, -144.4], Y1, Y1 + 1.6, { ...ash, ceil: false, arch: Y1 + 1.6, zone: 'osario_martin' });
  const PT = D.portal;
  add('portico', [-64, PT.z - PT.w / 2, -62, PT.z + PT.w / 2], Y1, PT.y0, { ...ash, ceil: false, arch: PT.y0, zone: 'martin' });
  // el atajo de los Inocentes: la escalera que baja de la cripta
  add('martinAtajo', [-75.5, -119, -72.5, -112.25], YI, Y1 + 2.4, { ...rock, ceil: false, floor: false, arch: Y1 + 2.4, stair: { axis: 'z', a0: -119, a1: -112.25, y0: Y1, y1: YI }, zone: 'inocentes' });
  add('inocentesRellano', [-75.5, -112.25, -72.5, -108], YI, YI + 2.4, { ...rock, ceil: false, arch: YI + 2.4, zone: 'inocentes' });

  // --- la antesala
  const H = D.hall,
    S = D.stair,
    Ds = D.dais,
    DS = D.daisStair,
    TR = D.terrace;
  const RT = { mat: 'ashlar', tint: DT, ceil: false, zone: 'antesala' };
  add('antesala', [H.x0, H.z0, H.x1, H.z1], DY, H.YS, { ...RT, floorTint: [0.78, 0.74, 0.7] });
  add('tribuna', [TR.x0, H.z0, TR.x1, H.z1], Y1, H.YS, { ...RT, base: DY, floorTint: [0.78, 0.74, 0.7] });
  add('escalinata', [S.x0, S.z - S.w / 2, S.x1, S.z + S.w / 2], DY, H.YS, { ...RT, floor: false, stair: { axis: 'x', a0: S.x0, a1: S.x1, y0: Y1, y1: DY } });
  add('estrado', [Ds.x0, Ds.z0, Ds.x1, Ds.z1], AY, H.YS, { ...RT, base: DY, floorMat: 'ashlar', floorTint: DT });
  add('estradoEscalera', [DS.x0, DS.z - DS.w / 2, DS.x1, DS.z + DS.w / 2], DY, H.YS, { ...RT, floor: false, stair: { axis: 'x', a0: DS.x0, a1: DS.x1, y0: DY, y1: AY } });
  // la puerta del dios: el hueco en los dos muros (el de la antesala y el de
  // la cisterna)
  add('puertaDios', [H.x1, D.door.z - D.door.w / 2, H.x1 + 1, D.door.z + D.door.w / 2], AY, AY + D.door.h, { mat: 'ashlar', tint: AT, floorMat: 'ashlar', floorTint: DT, zone: 'antesala' });
  // el pozo de los condenados: la escalera, el rellano y la sala
  const PZ = D.pozo,
    PS = D.pozoStair;
  add('pozoEscalera', [PS.x0, PS.z0, PS.x1, PS.z1], PY, DY + 3.0, { mat: 'ashlar', tint: [0.56, 0.52, 0.48], ceil: false, floor: false, arch: DY + 3.0, stair: { axis: 'z', a0: PS.z1, a1: PS.z0, y0: DY, y1: PY }, zone: 'pila_honda' });
  add('pozoRellano', [PS.x0, PZ.z1, PS.x1, PS.z0], PY, PY + 3.0, { mat: 'ashlar', tint: [0.56, 0.52, 0.48], ceil: false, zone: 'pila_honda' });
  add('pozo', [PZ.x0, PZ.z0, PZ.x1, PZ.z1], PY, PY + 6.0, { mat: 'ashlar', tint: [0.52, 0.48, 0.44], ceil: false, zone: 'pila_honda' });

  // --- las catacumbas de la Sé: galerías de 3 m con bóveda de cañón (sólo se
  // juntan en cámaras más altas que sus claves: el lucernario, el cruce de
  // los huesos y la cámara de la escalera), cubículos con su puerta y el
  // lucernario
  // (vault: el eje de la bóveda; ends: lunetos en sus extremos)
  const cata = (id, r, o = {}) => add(id, r, YC, YC + 2.2, { ...rock, ceil: false, niches: 'loculi', zone: 'catacumbas', ...o });
  const door = (id, r, y, zone, o = {}) => add(id, r, y, y + 1.9, { ...rock, zone, ...o });
  cata('c1Norte', [-36, -102.4, -33, -99], { vault: 'z', ends: [false, false] });
  add('lucernario', [-40, -99, -29, -88], YC, YC + 3.6, { ...rock, ceil: false, zone: 'lucernario' });
  cata('c1Este', [-29, -95, -15.5, -92], { vault: 'x', ends: [false, false] });
  add('c1Escalera', [-15.5, -103, -12.9, -92], YC, YC + 3.3, { ...rock, niches: 'loculi', zone: 'catacumbas' });
  add('llegadaBajada', [-12.9, -103, -7.5, -100.5], YC, Y + 2.2, { ...rock, ceil: false, floor: false, arch: Y + 2.2, stair: { axis: 'x', a0: -7.5, a1: -12.9, y0: Y, y1: YC }, zone: 'catacumbas' });
  add('llegadaPuerta', [-7.5, -103, -7, -100.5], Y, Y + 2.2, { ceil: false, walls: false, zone: 'crypt' });
  cata('c1Oeste', [-50, -95, -40, -92], { vault: 'x', ends: [false, false] });
  add('c1Cruce', [-54, -100, -50, -85], YC, YC + 3.3, { mat: 'skulls', tint: ST, niches: 'bones', zone: 'catacumbas' });
  cata('c1Poniente', [-62, -95, -54, -92], { vault: 'x', ends: [false, false] });
  cata('c1Sur', [-50, -87.5, -33, -85], { vault: 'x', ends: [false, true] });
  door('c1SurBoca', [-36, -88, -33, -87.5], YC, 'catacumbas');
  // los cubículos (cada uno con su arcosolio), con su puerta a la galería
  for (const [id, r, d] of CUBICULA) {
    add(id, r, YC, YC + 2.2, { ...rock, ceil: false, vault: 'x', zone: 'catacumbas', cubiculum: true });
    door(id + 'Puerta', d, YC, 'catacumbas');
  }
  add('c1Bajada', [-65.15, -95, -62, -92], YI, YC + 2.2, { ...rock, ceil: false, floor: false, arch: YC + 2.2, stair: { axis: 'x', a0: -62, a1: -65.15, y0: YC, y1: YI }, zone: 'inocentes' });

  // --- la catacumba de los Inocentes, su pila y el relicario
  const ino = (id, r, o = {}) => add(id, r, YI, YI + 2.2, { ...rock, ceil: false, niches: 'small', zone: 'inocentes', ...o });
  ino('c2Galeria', [-76, -95, -65.15, -92], { vault: 'x', ends: [false, false] });
  door('c2PilaPuerta', [-72, -96, -70, -95], YI, 'pila_oeste');
  add('pilaInocentes', [-76, -108, -66, -96], YI, YI + 2.6, { ...rock, ceil: false, zone: 'pila_oeste' });
  add('c2Cruce', [-80, -100, -76, -88], YI, YI + 3.3, { ...rock, niches: 'small', zone: 'inocentes' });
  ino('c2Cubiculo', [-80, -106, -76, -100], { vault: 'z', ends: [true, false] });
  const CL = D.claw;
  add('relicarioPuerta', [CL.x1, CL.gate.z0, -80, CL.gate.z1], YI, YI + 2.2, { ...rock, ceil: false, arch: YI + 2.2, zone: 'garra' });
  add('relicario', [CL.x0, CL.z0, CL.x1, CL.z1], YI, YI + 3.4, { mat: 'skulls', tint: ST, ceil: false, zone: 'garra' });

  // --- la cripta de los mártires (por el sepulcro del arzobispo)
  const MR = D.martyr,
    FH = D.fontHall,
    SA = D.sacristy;
  add('pasoPuerta', [16, -121.25, 16.5, -118.75], Y, Y + 2.2, { ceil: false, walls: false, zone: 'tomb' });
  add('pasoArzobispo', [16.5, -121.25, 20.2, -118.75], Y, Y + 2.2, { ...ash, ceil: false, zone: 'catacumbas_este' });
  add('pasoPeldanos', [20.2, -121.25, MR.x0, -118.75], Y1, Y + 2.2, { ...ash, ceil: false, floor: false, arch: Y + 2.2, stair: { axis: 'x', a0: 20.2, a1: MR.x0, y0: Y, y1: Y1 }, zone: 'catacumbas_este' });
  add('martyrium', [MR.x0, MR.z0, MR.x1, MR.z1], Y1, Y1 + 3.0, { ...ash, ceil: false, zone: 'catacumbas_este' });
  add('martyrBajada', [26.5, FH.z1, 30.5, MR.z0], YC, Y1 + 2.2, { ...ash, ceil: false, floor: false, arch: Y1 + 2.2, stair: { axis: 'z', a0: MR.z0, a1: FH.z1, y0: Y1, y1: YC }, zone: 'pila_este' });
  add('pilaMartires', [FH.x0, FH.z0, FH.x1, FH.z1], YC, YC + 3.0, { ...ash, ceil: false, zone: 'pila_este' });
  add('sacristiaPuerta', [SA.door.x - SA.door.w / 2, MR.z1, SA.door.x + SA.door.w / 2, SA.z0], Y1, Y1 + 2.4, { ...ash, zone: 'sacristia' });
  add('sacristia', [SA.x0, SA.z0, SA.x1, SA.z1], Y1, Y1 + 3.0, { mat: 'ashlar', tint: [0.72, 0.68, 0.62], floorMat: 'planks', ceilMat: 'wooddark', ceilTint: [0.5, 0.45, 0.4], zone: 'sacristia' });
  return R;
}
// los tres arcos entre la sala de los obispos y la cripta de San Martín:
// [centro (z), luz]
const ARCADE = [
  [-133.75, 3.5],
  [-128.25, 4],
  [-122.75, 3.5],
];
// los cubículos de las catacumbas de la Sé: [id, sala, puerta]
const CUBICULA = [
  ['c1CubiculoA', [-25.5, -100, -21, -96], [-24, -96, -22.5, -95]],
  ['c1CubiculoB', [-21, -91, -16.5, -87], [-19.5, -92, -18, -91]],
  ['c1CubiculoC', [-47.5, -100, -43, -96], [-46, -96, -44.5, -95]],
  ['c1CubiculoD', [-61, -100, -56.5, -96], [-59.5, -96, -58, -95]],
];
export const LAYOUT = layout();

// Altura del suelo en cada punto de la cripta (para la navegación de las
// criaturas): la de la sala más concreta que lo contiene (las escaleras, en
// rampa); fuera de todas, la de la cripta de arriba.
const FLOORS = [...LAYOUT].reverse();
export function cryptFloorY(x, z) {
  for (const g of FLOORS) {
    const r = g.r;
    if (x < r[0] || x > r[2] || z < r[1] || z > r[3]) continue;
    const s = g.stair;
    if (!s) return g.y;
    const a = s.axis === 'x' ? x : z;
    const k = Math.min(1, Math.max(0, (a - s.a0) / (s.a1 - s.a0)));
    return s.y0 + (s.y1 - s.y0) * k;
  }
  return Y;
}

// ------------------------------------------------------------ el excavador
// Levanta suelos, techos y muros de una red de salas a partir de su planta
// (ver layout()). Las cabeceras (sobre un vano que da a una sala más baja) y
// las tabicas (donde el suelo de al lado está más alto) salen solas.
// holes: [{ x0, z0, x1, z1, y0, y1 }], ventanas: se recortan de los lienzos
// cuyo plano las cruza. onWall(run) se llama con cada lienzo de muro.
const RES = 0.5;
function carve(ctx, C, regs, o = {}) {
  const wb = ctx.wb;
  const holes = o.holes ?? [];
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const g of regs) {
    x0 = Math.min(x0, g.r[0]);
    z0 = Math.min(z0, g.r[1]);
    x1 = Math.max(x1, g.r[2]);
    z1 = Math.max(z1, g.r[3]);
  }
  x0 -= 1;
  z0 -= 1;
  x1 += 1;
  z1 += 1;
  const nx = Math.round((x1 - x0) / RES),
    nz = Math.round((z1 - z0) / RES);
  const own = new Int32Array(nx * nz).fill(-1);
  regs.forEach((g, k) => {
    const i0 = Math.round((g.r[0] - x0) / RES),
      i1 = Math.round((g.r[2] - x0) / RES);
    const j0 = Math.round((g.r[1] - z0) / RES),
      j1 = Math.round((g.r[3] - z0) / RES);
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) own[j * nx + i] = k;
    if (g.ghost) return;
    C.paint(g.r[0], g.r[1], g.r[2], g.r[3], 1);
    const room = g.room ?? ROOM;
    if (g.floor !== false) {
      wb.box(g.floorMat ?? 'flag', g.r[0], g.y - 0.3, g.r[1], g.r[2], g.y, g.r[3], { faces: 't', ao: false, sub: 2.5, room, uv: g.floorMat === 'mosaic' ? 0.2 : 0.5, tint: g.floorTint });
      ctx.col.add(g.r[0], (g.base ?? g.y - 0.5) - 0.5, g.r[1], g.r[2], g.y, g.r[3]);
    }
    if (g.ceil !== false) {
      wb.box(g.ceilMat ?? g.mat ?? 'mossstone', g.r[0], g.top, g.r[1], g.r[2], g.top + 0.3, g.r[3], { faces: 'b', ao: false, sub: 2, room, tint: g.ceilTint ?? VT });
      ctx.col.add(g.r[0], g.top, g.r[1], g.r[2], g.top + 0.5, g.r[3]).cam = true;
    }
  });
  // los muros: por cada borde entre una celda de sala y otra cosa
  const faces = new Map();
  const segsFor = (A, B) => {
    if (!B) return [[A.ybot ?? A.y, A.arch ?? A.top]];
    const out = [];
    if (A.top > B.top + 0.01 && A.arch === undefined && B.arch === undefined) out.push([Math.max(B.top, A.y), A.top]);
    if (B.y > A.y + 0.01 && !A.stair && !B.stair) out.push([A.y, Math.min(B.y, A.top)]);
    return out;
  };
  const DIRS = [
    ['n', 0, -1],
    ['s', 0, 1],
    ['w', -1, 0],
    ['e', 1, 0],
  ];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = own[j * nx + i];
      if (a < 0 || regs[a].ghost || regs[a].walls === false) continue;
      for (const [d, di, dj] of DIRS) {
        const ni = i + di,
          nj = j + dj;
        const b = ni < 0 || nj < 0 || ni >= nx || nj >= nz ? -1 : own[nj * nx + ni];
        if (b === a) continue;
        for (const [ya, yb] of segsFor(regs[a], b < 0 ? null : regs[b])) {
          if (yb - ya < 0.02) continue;
          const line = d === 'n' ? j : d === 's' ? j + 1 : d === 'w' ? i : i + 1;
          const along = d === 'n' || d === 's' ? i : j;
          const key = `${d}|${line}|${a}|${ya.toFixed(3)}|${yb.toFixed(3)}|${b < 0 ? 'x' : 'r'}`;
          let f = faces.get(key);
          if (!f) faces.set(key, (f = { d, line, a, ya, yb, open: b >= 0, cells: [] }));
          f.cells.push(along);
        }
      }
    }
  const T = 0.05;
  const FACE = { n: 's', s: 'n', w: 'e', e: 'w' };
  for (const f of faces.values()) {
    f.cells.sort((p, q) => p - q);
    let s = 0;
    for (let k = 1; k <= f.cells.length; k++) {
      if (k < f.cells.length && f.cells[k] === f.cells[k - 1] + 1) continue;
      const c0 = f.cells[s],
        c1 = f.cells[k - 1] + 1;
      s = k;
      const g = regs[f.a];
      const opt = { faces: FACE[f.d], sub: 1.6, aoH: 1.4, aoMin: 0.5, baseY: g.y, room: g.room ?? ROOM, tint: g.tint ?? CT };
      const mat = g.mat ?? 'mossstone';
      const alongX = f.d === 'n' || f.d === 's';
      const at = alongX ? z0 + f.line * RES : x0 + f.line * RES;
      const a0 = (alongX ? x0 : z0) + c0 * RES,
        a1 = (alongX ? x0 : z0) + c1 * RES;
      // (las ventanas que cruzan este plano)
      const hs = holes.filter((h) => (alongX ? at >= h.z0 - 0.01 && at <= h.z1 + 0.01 : at >= h.x0 - 0.01 && at <= h.x1 + 0.01)).map((h) => (alongX ? [h.x0, h.y0, h.x1, h.y1] : [h.z0, h.y0, h.z1, h.y1]));
      for (const [ua, ya, ub, yb] of subtractRects([a0, f.ya, a1, f.yb], hs)) {
        if (ub - ua < 0.005 || yb - ya < 0.005) continue;
        if (f.d === 'n') wb.box(mat, ua, ya, at - T, ub, yb, at, opt);
        else if (f.d === 's') wb.box(mat, ua, ya, at, ub, yb, at + T, opt);
        else if (f.d === 'w') wb.box(mat, at - T, ya, ua, at, yb, ub, opt);
        else wb.box(mat, at, ya, ua, at + T, yb, ub, opt);
      }
      if (o.onWall && !f.open) o.onWall({ axis: alongX ? 'x' : 'z', face: FACE[f.d], at, a0, a1, y0: f.ya, y1: f.yb, reg: g });
    }
  }
}

// ------------------------------------------------------------ piezas
// Arco de un vano (o fajón) con los valores de esta cripta.
function arch(ctx, o) {
  return archRing(ctx, { mat: 'ashlar', spMat: o.spMat ?? 'ashlar', room: ROOM, tint: AT, spTint: o.spTint ?? OT, ...o });
}

// Un nicho de enterramiento en un lienzo de muro: el hueco negro, su marco
// de piedra y, dentro, huesos y calaveras (o la losa que lo cierra). w: el
// ancho; h: el alto.
function loculus(ctx, w, u, y0, kind, rng, hw = 0.55, h = 0.5) {
  const wb = ctx.wb;
  const room = w.reg.room ?? ROOM;
  // (plano del muro, hacia la sala)
  const sgn = w.face === 's' || w.face === 'e' ? 1 : -1;
  const at = w.at;
  const box = (mat, a0, a1, ya, yb, d0, d1, faces, tint) => {
    const p0 = at + sgn * d0,
      p1 = at + sgn * d1;
    if (w.axis === 'x') wb.box(mat, a0, ya, Math.min(p0, p1), a1, yb, Math.max(p0, p1), { ao: false, faces, room, tint, grime: mat !== 'black' });
    else wb.box(mat, Math.min(p0, p1), ya, a0, Math.max(p0, p1), yb, a1, { ao: false, faces, room, tint, grime: mat !== 'black' });
  };
  const front = w.face;
  const sides = w.axis === 'x' ? 'ew' : 'ns';
  if (kind === 'sealed') {
    // la losa, algo salida, con una cruz grabada (oscura)
    box('ashlar', u - hw, u + hw, y0, y0 + h, 0, 0.05, front + sides + 't', [0.7, 0.68, 0.64]);
    box('black', u - 0.03, u + 0.03, y0 + h * 0.2, y0 + h * 0.8, 0.05, 0.056, front, null);
    box('black', u - hw * 0.22, u + hw * 0.22, y0 + h * 0.56, y0 + h * 0.64, 0.05, 0.056, front, null);
    return;
  }
  box('black', u - hw, u + hw, y0, y0 + h, 0.008, 0.012, front, null);
  // el marco: repisa, dintel y jambas
  box('mossstone', u - hw - 0.07, u + hw + 0.07, y0 - 0.07, y0, 0, 0.11, front + sides + 't', AT);
  box('mossstone', u - hw - 0.07, u + hw + 0.07, y0 + h, y0 + h + 0.07, 0, 0.09, front + sides + 'b', AT);
  box('mossstone', u - hw - 0.07, u - hw, y0, y0 + h, 0, 0.09, front + sides, AT);
  box('mossstone', u + hw, u + hw + 0.07, y0, y0 + h, 0, 0.09, front + sides, AT);
  if (kind === 'skulls') {
    const n = Math.max(1, Math.min(3, Math.floor((hw * 2) / 0.3)));
    const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[front];
    if (w.axis === 'x') P.skullRow(ctx, u + rng.range(-0.1, 0.1), y0, at + sgn * 0.13, rot, rng.int(1, n), { room, gap: 0.26 });
    else P.skullRow(ctx, at + sgn * 0.13, y0, u + rng.range(-0.1, 0.1), rot, rng.int(1, n), { room, gap: 0.26 });
  }
}

// Nichos en los lienzos de las catacumbas: tres alturas de lóculos (de niño,
// cuatro alturas más pequeñas), y antorchas espaciadas.
function niches(ctx, runs, seed) {
  const rng = new RNG(seed);
  const torches = [];
  for (const w of [...runs].sort((p, q) => ((p.a0 * 7.3 + p.at * 3.1) % 1) - ((q.a0 * 7.3 + q.at * 3.1) % 1))) {
    if (w.a1 - w.a0 < 2.6 || w.reg.niches === 'bones') continue;
    const u = (w.a0 + w.a1) / 2;
    const [x, z] = w.axis === 'x' ? [u, w.at] : [w.at, u];
    if (torches.some((t) => Math.hypot(t[0] - x, t[1] - z) < 9)) continue;
    torches.push([x, z]);
    w.torch = u;
    P.wallTorch(ctx, x, w.y0 + 1.75, z, w.face, { room: ROOM, radius: 6 });
  }
  for (const w of runs) {
    const kind = w.reg.niches;
    const len = w.a1 - w.a0;
    if (kind === 'bones') {
      // el cruce de los huesos: los muros, de huesos apilados
      if (len < 0.8) continue;
      const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[w.face];
      const sg = w.face === 's' || w.face === 'e' ? 1 : -1;
      const u = (w.a0 + w.a1) / 2;
      const [x, z] = w.axis === 'x' ? [u, w.at + sg * 0.06] : [w.at + sg * 0.06, u];
      P.boneWall(ctx, x, w.y0, z, rot, len - 0.1, Math.min(2.3, w.y1 - w.y0 - 0.1), { room: ROOM, seed: Math.round(u * 13 + w.at) });
      continue;
    }
    if (kind === 'cubiculum') continue;
    const small = kind === 'small';
    const step = small ? 0.95 : 1.35;
    const n = Math.floor((len - 0.3) / step);
    const rows = small ? [0.35, 0.85, 1.35, 1.8] : [0.3, 0.98, 1.66];
    for (let k = 0; k < n; k++) {
      const u = w.a0 + (len - (n - 1) * step) / 2 + k * step;
      if (w.torch !== undefined && Math.abs(w.torch - u) < 0.8) continue;
      for (let r = 0; r < rows.length; r++) {
        const y0 = w.y0 + rows[r];
        if (y0 + (small ? 0.32 : 0.5) > w.y1 - 0.08) continue;
        const q = rng.next();
        if (small) loculus(ctx, w, u, y0, q < 0.55 ? 'sealed' : q < 0.8 ? 'skulls' : 'empty', rng, 0.32, 0.3);
        else loculus(ctx, w, u, y0, q < 0.45 ? 'sealed' : q < 0.75 ? 'skulls' : 'empty', rng);
      }
    }
  }
}

// Ventana enrejada en un muro entre dos espacios: el derrame (alféizar,
// dintel y jambas por el grueso del muro), el marco de las dos caras y los
// barrotes. axis: 'x' si el muro corre a lo largo de x (de z0 a z1 de grueso).
function grille(ctx, o) {
  const wb = ctx.wb;
  const { axis, u0, u1, t0, t1, y0, y1 } = o;
  const room = o.room ?? ROOM;
  const B = (a0, ya, b0, a1, yb, b1, faces, mat = 'ashlar', tint = AT) => {
    if (axis === 'x') wb.box(mat, a0, ya, b0, a1, yb, b1, { faces, ao: false, room, tint });
    else wb.box(mat, b0, ya, a0, b1, yb, a1, { faces, ao: false, room, tint });
  };
  // el derrame
  B(u0, y0 - 0.06, t0, u1, y0, t1, 't');
  B(u0, y1, t0, u1, y1 + 0.06, t1, 'b');
  B(u0 - 0.06, y0, t0, u0, y1, t1, axis === 'x' ? 'e' : 's');
  B(u1, y0, t0, u1 + 0.06, y1, t1, axis === 'x' ? 'w' : 'n');
  // los barrotes, en mitad del grueso
  const tm = (t0 + t1) / 2;
  const n = Math.max(2, Math.round((u1 - u0) / 0.24));
  for (let k = 1; k < n; k++) {
    const u = u0 + ((u1 - u0) * k) / n;
    B(u - 0.022, y0, tm - 0.022, u + 0.022, y1, tm + 0.022, 'nsew', 'iron', null);
  }
  for (const y of [y0 + (y1 - y0) * 0.3, y0 + (y1 - y0) * 0.72]) B(u0, y - 0.025, tm - 0.03, u1, y + 0.025, tm + 0.03, 'nsewtb', 'iron', null);
  // el marco de sillería, en las caras que se piden (sides: [lado t0, lado t1])
  for (const [t, sg] of [
    [t0, -1],
    [t1, 1],
  ]) {
    if (o.frame && !o.frame[sg < 0 ? 0 : 1]) continue;
    const ta = sg < 0 ? t - 0.08 : t,
      tb = sg < 0 ? t : t + 0.08;
    const f = axis === 'x' ? (sg < 0 ? 'nsewtb'.replace('s', '') : 'nsewtb'.replace('n', '')) : sg < 0 ? 'nsewtb'.replace('e', '') : 'nsewtb'.replace('w', '');
    B(u0 - 0.2, y0 - 0.2, ta, u1 + 0.2, y0 - 0.06, tb, f);
    B(u0 - 0.2, y1 + 0.06, ta, u1 + 0.2, y1 + 0.24, tb, f);
    B(u0 - 0.2, y0 - 0.06, ta, u0 - 0.06, y1 + 0.06, tb, f);
    B(u1 + 0.06, y0 - 0.06, ta, u1 + 0.2, y1 + 0.06, tb, f);
  }
}

// Costillas de piedra que cruzan el techo de una galería (con sus ménsulas).
function ribs(ctx, r, axis, top, every, o = {}) {
  const wb = ctx.wb;
  const room = o.room ?? ROOM;
  const tint = o.tint ?? AT;
  if (axis === 'z') {
    for (let z = r[1] + every / 2; z < r[3] - 0.4; z += every) {
      wb.box('ashlar', r[0], top - 0.28, z - 0.18, r[2], top, z + 0.18, { faces: 'nsb', ao: false, room, tint });
      for (const x of [r[0], r[2]]) {
        const d = x === r[0] ? 1 : -1;
        wb.box('ashlar', Math.min(x, x + d * 0.14), top - 0.62, z - 0.2, Math.max(x, x + d * 0.14), top - 0.28, z + 0.2, { faces: 'nsb' + (d > 0 ? 'e' : 'w'), ao: false, room, tint });
      }
    }
  } else {
    for (let x = r[0] + every / 2; x < r[2] - 0.4; x += every) {
      wb.box('ashlar', x - 0.18, top - 0.28, r[1], x + 0.18, top, r[3], { faces: 'ewb', ao: false, room, tint });
      for (const z of [r[1], r[3]]) {
        const d = z === r[1] ? 1 : -1;
        wb.box('ashlar', x - 0.2, top - 0.62, Math.min(z, z + d * 0.14), x + 0.2, top - 0.28, Math.max(z, z + d * 0.14), { faces: 'ewb' + (d > 0 ? 's' : 'n'), ao: false, room, tint });
      }
    }
  }
}

// Una pila de sangre: la taza de piedra (ochavada) sobre su basa, con su
// sumidero; la sangre de dentro la pone el juego (game/crypt.js), que la
// hace bajar al abrir la compuerta.
function bloodFont(ctx, x, y, z, room) {
  const wb = ctx.wb;
  const R = 1.35;
  wb.cylinder('ashlar', x, y, z, R + 0.35, R + 0.45, 0.3, 8, { ao: false, capTop: true, room, tint: AT });
  wb.cylinder('ashlar', x, y + 0.3, z, R * 0.55, R * 0.62, 0.35, 8, { ao: false, room, tint: AT });
  // la taza: el borde (ocho tramos) y el fondo
  const N = 8;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 + Math.PI / N;
    wb.push();
    wb.translate(x + Math.cos(a) * R, y + 0.65, z + Math.sin(a) * R);
    wb.rotateY(-a + Math.PI / 2);
    const L = 2 * R * Math.tan(Math.PI / N) + 0.24;
    // (uno sí y otro no, un dedo más alto: las esquinas se solapan)
    wb.box('ashlar', -L / 2, 0, -0.14, L / 2, 0.55 + (k % 2) * 0.012, 0.14, { ao: false, room, tint: AT, faces: 'tnsew' });
    wb.pop();
  }
  wb.cylinder('mossstone', x, y + 0.65, z, R, R, 0.06, 8, { ao: false, capTop: true, room, tint: [0.35, 0.3, 0.28] });
  ctx.col.add(x - R - 0.2, y, z - R - 0.2, x + R + 0.2, y + 1.2, z + R + 0.2);
  P.candles(ctx, x + R + 0.6, y, z + 0.4, 5, Math.round(x * 13 + z), { room, radius: 4, intensity: 0.8, spread: 0.3 });
  P.candles(ctx, x - R - 0.6, y, z - 0.4, 4, Math.round(x * 7 - z), { room, radius: 3, intensity: 0.5, spread: 0.3 });
  ctx.lights.push({ x, y: y + 1.6, z, r: 0.9, g: 0.15, b: 0.1, radius: 5, intensity: 0.7, room });
}

// La compuerta de una pila: la placa de hierro en el muro y la cadena que
// baja de lo alto (la palanca del juego; ver interact.js).
function chainMount(ctx, x, y, z, dir, room) {
  const wb = ctx.wb;
  const d = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
  const px = x - d[0] * 0.45,
    pz = z - d[1] * 0.45;
  if (d[0]) wb.box('iron', px - 0.05, y + 0.4, pz - 0.6, px + 0.05, y + 2.4, pz + 0.6, { ao: false, room });
  else wb.box('iron', px - 0.6, y + 0.4, pz - 0.05, px + 0.6, y + 2.4, pz + 0.05, { ao: false, room });
  for (let k = 0; k < 9; k++) wb.box('iron', px - 0.03, y + 2.6 + k * 0.12, pz - 0.03, px + 0.03, y + 2.7 + k * 0.12, pz + 0.03, { ao: false, room });
}

// Una estatua colosal de un velado (de pie, con las manos sobre la espada).
function giantVeiled(ctx, x, y, z, rot, s = 1, room = ROOM) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -0.9 * s, 0, -0.9 * s, 0.9 * s, 0.6 * s, 0.9 * s, { sub: 2, room, tint: AT });
    wb.cylinder('ashlar', 0, 0.6 * s, 0, 0.75 * s, 0.5 * s, 3.2 * s, 10, { ao: false, room, tint: CT });
    wb.cylinder('ashlar', 0, 3.8 * s, 0, 0.5 * s, 0.34 * s, 0.6 * s, 10, { ao: false, room, tint: CT });
    // el velo sobre la cabeza y los hombros
    wb.cylinder('ashlar', 0, 3.4 * s, 0, 0.68 * s, 0.2 * s, 1.5 * s, 10, { ao: false, capTop: true, room, tint: [0.8, 0.78, 0.74] });
    wb.cylinder('ashlar', 0, 1.0 * s, 0, 0.82 * s, 0.7 * s, 1.7 * s, 10, { ao: false, open: true, room, tint: [0.8, 0.78, 0.74] });
    // las manos sobre el pomo de la espada, la hoja hasta el suelo
    wb.box('ashlar', -0.18 * s, 2.3 * s, 0.55 * s, 0.18 * s, 2.6 * s, 0.85 * s, { ao: false, room, tint: AT });
    wb.box('ashlar', -0.5 * s, 2.0 * s, 0.68 * s, 0.5 * s, 2.12 * s, 0.82 * s, { ao: false, room, tint: AT });
    wb.box('ashlar', -0.09 * s, 0.6 * s, 0.7 * s, 0.09 * s, 2.0 * s, 0.8 * s, { ao: false, room, tint: AT });
  });
  ctx.col.add(x - 0.9 * s, y, z - 0.9 * s, x + 0.9 * s, y + 4.6 * s, z + 0.9 * s);
}

// Antepecho de piedra (con su colisión) de a0 a a1 a lo largo de 'axis'.
function parapet(ctx, axis, at, a0, a1, y, h = 0.95, o = {}) {
  const wb = ctx.wb;
  const t = o.t ?? 0.15;
  if (axis === 'x') {
    wb.box('ashlar', a0, y, at - t, a1, y + h, at + t, { faces: 'tnsew', ao: false, room: ROOM, tint: AT, sub: 2 });
    ctx.col.add(a0, y, at - t, a1, y + h + 0.05, at + t);
  } else {
    wb.box('ashlar', at - t, y, a0, at + t, y + h, a1, { faces: 'tnsew', ao: false, room: ROOM, tint: AT, sub: 2 });
    ctx.col.add(at - t, y, a0, at + t, y + h + 0.05, a1);
  }
}

// Losa sepulcral en el suelo, con su cruz grabada.
function ledger(ctx, x, y, z, rot, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -0.95, 0, -0.45, 0.95, 0.03, 0.45, { faces: 'tnsew', ao: false, room: ROOM, tint: [0.6, 0.57, 0.52].map((v) => v * rng.range(0.9, 1.05)) });
    wb.box('black', -0.6, 0.031, -0.03, 0.55, 0.033, 0.03, { faces: 't', ao: false, grime: false, room: ROOM });
    wb.box('black', 0.25, 0.031, -0.22, 0.31, 0.033, 0.22, { faces: 't', ao: false, grime: false, room: ROOM });
  });
}

// ------------------------------------------------------------ la cripta honda
export function buildDeepCrypt(ctx, C, L) {
  const wb = ctx.wb;
  const D = DEEP;
  const rng = new RNG(4401);
  wb.setRoom(ROOM);
  const regs = LAYOUT.map((g) => ({ ...g }));
  const byId = (id) => regs.find((g) => g.id === id);

  // las ventanas: las tres de la sala de los obispos (a lo alto de la nave
  // lateral del sur de la antesala) y la de la Confesión (a la cisterna)
  const OB = D.obispos;
  const WIN = [-50.5, -43.5, -36.5].map((x) => ({ x0: x - 0.8, z0: -137, x1: x + 0.8, z1: -136, y0: Y1 + 0.8, y1: Y1 + 2.3 }));
  const CW = D.confessio.win;
  const holes = [...WIN, { x0: CW.x0, z0: -136.5, x1: CW.x1, z1: -136.3, y0: CW.y0, y1: CW.y1 }];
  const runs = [];
  carve(ctx, C, regs, {
    holes,
    onWall: (w) => {
      if (w.reg.niches && w.a1 - w.a0 >= 0.8) runs.push(w);
    },
  });
  niches(ctx, runs, 4402);

  // bóvedas de cañón de las galerías de catacumba (con sus lunetos donde
  // acaban contra la roca)
  for (const g of regs) {
    if (!g.vault) continue;
    const [x0, z0, x1, z1] = g.r;
    const span = g.vault === 'x' ? z1 - z0 : x1 - x0;
    const rise = Math.min(span / 2 - 0.05, g.vaultRise ?? 1.0);
    const rk = g.mat === 'rock';
    barrelVault(ctx, { x0, z0, x1, z1, axis: g.vault, ys: g.top, rise, mat: rk ? 'rock' : 'mossstone', tint: rk ? RK.map((v) => v * 0.92) : VT, room: ROOM, sub: 1.0, impostMat: rk ? 'rock' : 'ashlar', impostTint: rk ? RK.map((v) => v * 0.8) : AT });
    const c = g.vault === 'x' ? (z0 + z1) / 2 : (x0 + x1) / 2;
    const ends = g.ends ?? [true, true];
    const ats = g.vault === 'x' ? [x0, x1] : [z0, z1];
    for (let k = 0; k < 2; k++) if (ends[k]) lunette(ctx, { axis: g.vault, at: ats[k], c, span, ys: g.top, rise, face: k ? -1 : 1, mat: g.mat === 'rock' ? 'rock' : 'mossstone', tint: g.mat === 'rock' ? RK : CT, room: ROOM });
    crown(ctx, x0, z0, x1, z1, g.top + rise);
  }

  buildConfessio(ctx, L);
  buildObispos(ctx, L, rng);
  buildMartin(ctx, L, rng);
  buildAntesala(ctx, L);
  buildPozo(ctx, L);
  buildCatacumbas(ctx, L, byId);
  buildInocentes(ctx, L);
  buildMartires(ctx, L);
  buildFonts(ctx, L);
  buildCreatures(L);

  wb.setRoom(null);

  // ------------------------------------------------------------ zonas y mapa
  const zr = (r, y0, y1) => [r[0], r[1], r[2], r[3], y0, y1];
  const ZONES = {
    confesion: 'crypt',
    obispos: 'crypt',
    martin: 'crypt',
    capilla_martin: 'chapel',
    osario_martin: 'crypt',
    antesala: 'sanctum',
    pila_honda: 'crypt',
    catacumbas: 'crypt',
    lucernario: 'crypt',
    inocentes: 'crypt',
    pila_oeste: 'crypt',
    garra: 'crypt',
    catacumbas_este: 'crypt',
    pila_este: 'crypt',
    sacristia: 'chapel',
  };
  const zones = new Map();
  for (const g of regs) {
    if (g.ghost || !g.zone || !ZONES[g.zone]) continue;
    // (la altura: del suelo más hondo de la sala a la bóveda)
    const lo = Math.min(g.y, g.stair ? Math.min(g.stair.y0, g.stair.y1) : g.y) - 1,
      hi = g.top + 4;
    if (!zones.has(g.zone)) zones.set(g.zone, { id: g.zone, rects: [], atmo: ZONES[g.zone], room: ROOM });
    zones.get(g.zone).rects.push(zr(g.r, lo, hi));
  }
  L.zones.push(...zones.values());
  for (const g of regs) {
    if (g.ghost || !g.zone || !ZONES[g.zone]) continue;
    L.map.push({ id: g.zone, r: [g.r[0], g.r[1], g.r[2], g.r[3]], level: 'crypt' });
  }
}

// ------------------------------------------------------------ la Confesión
// Al fondo del osario: una cámara estrecha con su bóveda, el sello del santo
// y, en el muro de la cisterna, la fenestella: por la reja se ve al arzobispo
// rezar ante la masa de carne.
function buildConfessio(ctx, L) {
  const wb = ctx.wb;
  const CF = DEEP.confessio,
    CW = CF.win;
  const cz = (CF.z0 + CF.z1) / 2,
    span = CF.z1 - CF.z0;
  barrelVault(ctx, { x0: CF.x0, z0: CF.z0, x1: CF.x1, z1: CF.z1, axis: 'x', ys: Y + 3.3, rise: 1.1, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
  lunette(ctx, { axis: 'x', at: CF.x0, c: cz, span, ys: Y + 3.3, rise: 1.1, face: 1, mat: 'ashlar', tint: OT, room: ROOM });
  lunette(ctx, { axis: 'x', at: CF.x1, c: cz, span, ys: Y + 3.3, rise: 1.1, face: -1, mat: 'ashlar', tint: OT, room: ROOM });
  ctx.col.addCam(CF.x0, Y + 4.3, CF.z0, CF.x1, Y + 4.8, CF.z1);
  // la boca del osario: el marco de sillería de este lado
  for (const s of [-1, 1]) wb.box('ashlar', s * 1.5 + (s < 0 ? -0.3 : 0), Y, -133.62, s * 1.5 + (s > 0 ? 0.3 : 0), Y + 3.2, -133.5, { ao: false, room: ROOM, tint: AT, faces: 'nsew' });
  wb.box('ashlar', -1.8, Y + 3.2, -133.62, 1.8, Y + 3.42, -133.5, { ao: false, room: ROOM, tint: AT, faces: 'nb' });
  // la fenestella: el derrame por los dos muros (el de la cisterna y el de la
  // cámara) y los barrotes
  grille(ctx, { axis: 'x', u0: CW.x0, u1: CW.x1, t0: -137, t1: CF.z0, y0: CW.y0, y1: CW.y1, frame: [false, true] });
  // el reclinatorio ante la reja, velas en el suelo y el sello del santo
  wb.box('wooddark', -0.6, Y, -135.6, 0.6, Y + 0.18, -135.2, { faces: 'tnsew', ao: false, room: ROOM });
  wb.box('wooddark', -0.6, Y, -136.3, 0.6, Y + 0.9, -136.0, { faces: 'tnsew', ao: false, room: ROOM });
  ctx.col.add(-0.6, Y, -136.3, 0.6, Y + 0.9, -135.2);
  P.candles(ctx, -2.8, Y, -135.6, 7, 4603, { room: ROOM, radius: 4, intensity: 0.8, spread: 0.4 });
  P.candles(ctx, 2.9, Y, -134.3, 4, 4604, { room: ROOM, radius: 3, intensity: 0.5, spread: 0.3 });
  for (const x of [-3.97, 3.97]) {
    // el sello de San Martín: una cruz grabada en cada testero
    const f = x < 0 ? 'e' : 'w';
    wb.box('black', x - 0.01, Y + 1.0, cz - 0.04, x + 0.01, Y + 2.2, cz + 0.04, { faces: f, ao: false, grime: false, room: ROOM });
    wb.box('black', x - 0.01, Y + 1.75, cz - 0.4, x + 0.01, Y + 1.83, cz + 0.4, { faces: f, ao: false, grime: false, room: ROOM });
  }
  P.bones(ctx, 3.0, Y, -135.7, 6, 4605, 0.5);
  // (desde dentro de la cisterna llega una luz roja)
  ctx.lights.push({ x: 0, y: Y + 1.6, z: -136.9, r: 0.9, g: 0.2, b: 0.12, radius: 3.5, intensity: 0.6, room: ROOM });
  L.interact.push({ kind: 'note', id: 'n_confesion', note: 'confesion', x: -3.7, y: Y + 1.4, z: cz + 0.4, model: 'wall', r: 1.8 });
}

// Una lápida en un muro (las inscripciones que se leen): la losa con sus
// renglones grabados. face: hacia dónde mira ('n','s','e','w').
function plaque(ctx, x, y, z, face, w = 0.9, h = 0.6) {
  const wb = ctx.wb;
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[face];
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -w / 2, -h / 2, -0.04, w / 2, h / 2, 0.04, { faces: 'nsewtb', ao: false, room: ROOM, tint: [0.8, 0.77, 0.7] });
    for (let k = 0; k < 4; k++) {
      const yy = h / 2 - 0.12 - k * ((h - 0.2) / 4);
      wb.box('black', -w / 2 + 0.1, yy - 0.012, 0.04, w / 2 - 0.1 - (k === 3 ? w * 0.3 : 0), yy + 0.012, 0.043, { faces: 's', ao: false, grime: false, room: ROOM });
    }
  });
}

// Un techo de verdad en la clave de una bóveda (de él se cuelgan los
// rastreros; la cámara ya tiene sus capas).
const crown = (ctx, x0, z0, x1, z1, y) => (ctx.col.add(x0, y - 0.02, z0, x1, y + 0.4, z1).cam = true);

// Arcosolio fingido en un muro: el arco con su rosca, el fondo oscuro y el
// sepulcro debajo. face: hacia dónde mira el muro.
function arcosolium(ctx, x, y, z, face, o = {}) {
  const wb = ctx.wb;
  const w = o.w ?? 2.2,
    rise = o.rise ?? 0.8,
    y0 = y + (o.spring ?? 1.0);
  const alongX = face === 'n' || face === 's';
  const sg = face === 's' || face === 'e' ? 1 : -1;
  const at = alongX ? z : x;
  const c = alongX ? x : z;
  // el fondo (un dedo dentro del muro, oscuro)
  const d0 = at + sg * 0.012;
  const back = (u0, u1, ya, yb) => (alongX ? wb.box('mossstone', u0, ya, Math.min(at, d0), u1, yb, Math.max(at, d0), { faces: face, ao: false, room: ROOM, tint: [0.32, 0.3, 0.28] }) : wb.box('mossstone', Math.min(at, d0), ya, u0, Math.max(at, d0), yb, u1, { faces: face, ao: false, room: ROOM, tint: [0.32, 0.3, 0.28] }));
  const n = 6;
  for (let k = 0; k < n; k++) {
    const u0 = c - w / 2 + (w * k) / n,
      u1 = c - w / 2 + (w * (k + 1)) / n;
    const um = (u0 + u1) / 2 - c;
    const yy = y0 + rise * Math.sqrt(Math.max(0, 1 - (um / (w / 2)) ** 2));
    back(u0, u1, y + 0.9, yy);
  }
  archRing(ctx, { axis: alongX ? 'x' : 'z', c, w, y0, rise, ring: 0.2, t0: sg > 0 ? at : at - 0.1, t1: sg > 0 ? at + 0.1 : at, mat: 'ashlar', room: ROOM, tint: AT, cam: false });
  for (const s of [-1, 1]) {
    const u = c + s * (w / 2 + 0.1);
    if (alongX) wb.box('ashlar', u - 0.1, y, Math.min(at, at + sg * 0.1), u + 0.1, y0, Math.max(at, at + sg * 0.1), { ao: false, room: ROOM, tint: AT });
    else wb.box('ashlar', Math.min(at, at + sg * 0.1), y, u - 0.1, Math.max(at, at + sg * 0.1), y0, u + 0.1, { ao: false, room: ROOM, tint: AT });
  }
  // el sepulcro, arrimado al muro
  const rot = alongX ? 0 : Math.PI / 2;
  const off = sg * 0.62;
  P.sarcophagus(ctx, alongX ? c : x + off, y, alongX ? z + off : c, rot, { room: ROOM, l: w / 2 - 0.15, w: 0.5, effigy: o.effigy, open: o.open });
}

// ------------------------------------------------------------ la sala de los obispos
// El primer espacio de lo hondo: un bosque de columnas bajas bajo bóvedas de
// arista, con los sepulcros de los obispos entre ellas. Se entra por la
// tribuna del templo (cuatro peldaños); al norte, tres ventanas enrejadas a lo
// alto de la antesala (la luz roja); al oeste, los tres arcos de la cripta de
// San Martín; al sur, la bajada a las catacumbas.
function buildObispos(ctx, L, rng) {
  const wb = ctx.wb;
  const OB = DEEP.obispos,
    LD = DEEP.landing;
  const xs = [],
    zs = [];
  for (let x = OB.x0; x <= OB.x1 + 0.01; x += 5) xs.push(x);
  for (let z = OB.z0; z <= OB.z1 + 0.01; z += 5) zs.push(z);
  const MB = DEEP.martin;
  groinVaults(ctx, {
    xs,
    zs,
    ys: OB.YS,
    rise: OB.rise,
    mat: 'mossstone',
    tint: VT,
    room: ROOM,
    walls: { n: true, s: true, e: true, w: true },
    holes: [{ side: 'e', u0: -119.3, u1: -116.2, y: Y + 3.5 }, ...ARCADE.map(([c, w]) => ({ side: 'w', u0: c - w / 2 - 0.3, u1: c + w / 2 + 0.3, y: MB.YS })), { side: 's', u0: -36.3, u1: -32.7, y: Y1 + 3.5 }],
    ribs: true,
    ribMat: 'ashlar',
    ribTint: AT,
    ribW: 0.34,
    ribD: 0.2,
  });
  crown(ctx, OB.x0, OB.z0, OB.x1, OB.z1, OB.YS + OB.rise);
  // las columnas y, en los muros, sus pilastras
  for (let i = 1; i < xs.length - 1; i++) for (let j = 1; j < zs.length - 1; j++) P.column(ctx, xs[i], Y1, zs[j], OB.YS - Y1, 0.3, { mat: 'ashlar' });
  const pil = { room: ROOM, tint: AT, w: 0.5, d: 0.16 };
  for (let i = 1; i < xs.length - 1; i++) {
    pilaster(ctx, OB.z0, xs[i], 's', Y1, OB.YS, pil);
    if (Math.abs(xs[i] + 34.5) > 2) pilaster(ctx, OB.z1, xs[i], 'n', Y1, OB.YS, pil);
  }
  for (let j = 1; j < zs.length - 1; j++) {
    if (!ARCADE.some(([c, w]) => Math.abs(zs[j] - c) < w / 2 + 0.6)) pilaster(ctx, OB.x0, zs[j], 'e', Y1, OB.YS, pil);
    if (zs[j] < -122 || zs[j] > -113) pilaster(ctx, OB.x1, zs[j], 'w', Y1, OB.YS, pil);
  }
  // el umbral del templo: la bóveda del paso, su arco, el rellano y los
  // cuatro peldaños entre dos columnas
  barrelVault(ctx, { x0: -22, x1: -19.5, z0: -119, z1: -116.5, axis: 'x', ys: Y + 2.2, rise: 1.0, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
  arch(ctx, { axis: 'z', c: -117.75, w: 2.5, y0: Y + 2.2, rise: 1.0, ring: 0.3, t0: -22.15, t1: -22, top: Y + 3.5, clip: [-119.3, -116.2] });
  stairs(ctx, -26.3, Y1, -118.5, 'e', 4, 4, 0.3, 0.45, 'ashlar', { solidBelow: true });
  parapet(ctx, 'z', LD.x0 + 0.15, LD.z0 + 0.3, -120.5, Y);
  parapet(ctx, 'z', LD.x0 + 0.15, -116.5, LD.z1 - 0.3, Y);
  parapet(ctx, 'x', LD.z0 + 0.15, LD.x0, LD.x1, Y);
  parapet(ctx, 'x', LD.z1 - 0.15, LD.x0, LD.x1, Y);
  P.candelabra(ctx, -23.2, Y, -120.6, { room: ROOM });
  P.candelabra(ctx, -23.2, Y, -114.9, { room: ROOM });
  // las tres ventanas a la antesala (por dentro, el marco; por fuera, en lo
  // alto de su nave lateral, también)
  for (const x of [-50.5, -43.5, -36.5]) grille(ctx, { axis: 'x', u0: x - 0.8, u1: x + 0.8, t0: -137, t1: OB.z0, y0: Y1 + 0.8, y1: Y1 + 2.3 });
  // la bajada a las catacumbas: los peldaños, la bóveda en rampa y su arco
  stairs(ctx, -34.5, YC, -102.4, 'n', 3, 8, 0.3, 0.45, 'flag', { solidBelow: true });
  rampVault(ctx, { x0: -36, x1: -33, z0: -106, z1: -102.4, ys0: Y1 + 2.2, ys1: YC + 2.2, rise: 1.0, mat: 'rock', tint: RK, room: ROOM });
  arch(ctx, { axis: 'x', c: -34.5, w: 3, y0: Y1 + 2.2, rise: 1.0, ring: 0.3, t0: -106, t1: -105.85, top: Y1 + 3.5, clip: [-36.3, -32.7] });
  // los sepulcros de los obispos: dos hileras junto a los muros largos y los
  // del medio, más ricos; losas sepulcrales por el suelo
  const tombs = [
    [-54.5, -133.4, 0, { effigy: true }],
    [-44.5, -133.4, 0, { effigy: true }],
    [-29.5, -133.4, 0, { open: true }],
    [-54.5, -108.6, 0, { effigy: true }],
    [-44.5, -108.6, 0, { open: true }],
    [-24.5, -108.6, 0, { effigy: true }],
    [-49.5, -121, Math.PI / 2, { effigy: true }],
    [-39.5, -121, Math.PI / 2, { effigy: true }],
    [-59.5, -118.5, Math.PI / 2, { open: true }],
  ];
  for (const [x, z, rot, o] of tombs) P.sarcophagus(ctx, x, Y1, z, rot, { room: ROOM, ...o });
  for (const [x, z] of [
    [-54.5, -123.5],
    [-44.5, -116.5],
    [-34.5, -123.5],
    [-29.5, -113.5],
    [-49.5, -128.5],
    [-39.5, -113.5],
    [-59.5, -128.5],
  ])
    ledger(ctx, x, Y1, z, Math.PI / 2, Math.round(x * 7 + z));
  // la luz: lámparas en las claves, velas en los sepulcros y antorchas
  for (const [x, z] of [
    [-59.5, -133.5],
    [-49.5, -128.5],
    [-39.5, -133.5],
    [-29.5, -128.5],
    [-54.5, -118.5],
    [-44.5, -113.5],
    [-34.5, -118.5],
    [-59.5, -108.5],
    [-39.5, -108.5],
    [-24.5, -113.5],
  ])
    P.hangingLamp(ctx, x, OB.YS + OB.rise - 0.1, z, { room: ROOM, len: 1.1, radius: 7.5, intensity: 1.0 });
  // (luz de relleno: la sala no queda negra entre lámpara y lámpara)
  for (const x of [-52, -32])
    for (const z of [-128, -114]) ctx.lights.push({ x, y: Y1 + 2.6, z, r: 1, g: 0.62, b: 0.36, radius: 13, intensity: 0.35, room: ROOM });
  for (const [x, z, n, s] of [
    [-55.8, -132.2, 6, 4701],
    [-43.2, -132.4, 4, 4702],
    [-53.2, -109.8, 5, 4703],
    [-25.8, -109.6, 6, 4704],
    [-48.2, -119.6, 4, 4705],
    [-38.2, -122.6, 3, 4706],
  ])
    P.candles(ctx, x, Y1, z, n, s, { room: ROOM, radius: 4, intensity: 0.8 });
  for (const z of [-128.5, -111]) P.wallTorch(ctx, OB.x1, Y1 + 2.3, z, 'w', { room: ROOM, radius: 7 });
  P.wallTorch(ctx, OB.x0, Y1 + 2.3, -113.5, 'e', { room: ROOM, radius: 7 });
  for (const x of [-59.5, -49.5, -39.5, -24.5]) P.wallTorch(ctx, x, Y1 + 2.3, OB.z1, 'n', { room: ROOM, radius: 7 });
  for (const x of [-59.5, -47, -32]) P.wallTorch(ctx, x, Y1 + 2.3, OB.z0, 's', { room: ROOM, radius: 7 });
  // (por las ventanas entra la luz roja de la antesala)
  for (const x of [-50.5, -43.5, -36.5]) ctx.lights.push({ x, y: Y1 + 1.6, z: -135.2, r: 1, g: 0.32, b: 0.18, radius: 4.5, intensity: 0.7, room: ROOM });
  // restos y muertos
  bakeCorpse(ctx.wb, -46.8, Y1, -126.4, 0.6, 'face', 'villager', 4710);
  P.decal(ctx, -46.8, Y1 + 0.02, -126.4, 1.7);
  bakeCorpse(ctx.wb, -31.2, Y1, -131.8, 2.3, 'sit', 'villager', 4711);
  P.bones(ctx, -58.6, Y1, -110.2, 9, 4712, 0.8);
  P.bones(ctx, -27.4, Y1, -127.2, 6, 4713, 0.6);
  P.rubble(ctx, -60.4, Y1, -134.2, 6, 4714, 1.0, { mat: 'ashlar', scale: 0.9 });
  ctx.rats.push({ x: -57.5, y: Y1, z: -109.5, n: 2 });
  ctx.rats.push({ x: -26, y: Y1, z: -133, n: 2 });
  // la inscripción de las pilas, junto al umbral
  plaque(ctx, OB.x1 - 0.06, Y1 + 1.6, -125.5, 'w', 1.1, 0.7);
  L.interact.push({ kind: 'note', id: 'n_pilas', note: 'pilas', x: OB.x1 - 0.4, y: Y1 + 1.4, z: -125.5, model: 'wall', r: 1.8 });
  L.phantoms.push({ x: -57, y: Y1, z: -131, trigger: [-30, Y1, -118], kind: 'mourner' });
  void rng;
}

// ------------------------------------------------------------ la cripta de San Martín
// La iglesia del santo, bajo tierra: nave de 8 m con su bóveda de cañón y
// fajones, naves laterales tras arquerías sobre columnas bajas, y al norte,
// dos peldaños arriba, la capilla del altar (donde se descansa). En el muro
// del oeste, el osario; en el del este, el Pórtico de los Velados, en el eje
// de la antesala; al sur, la puerta del atajo de los Inocentes.
function buildMartin(ctx, L, rng) {
  const wb = ctx.wb;
  const MB = DEEP.martin,
    CH = DEEP.chapel,
    OS = DEEP.osario,
    PT = DEEP.portal;
  const [xa, xb] = MB.rows;
  // las columnas y las arquerías (con sus enjutas hasta el arranque)
  for (const x of MB.rows) {
    for (const z of MB.cols) P.column(ctx, x, Y1, z, MB.YC - Y1, 0.42, { mat: 'ashlar' });
    const zs = [MB.z0, ...MB.cols, MB.z1];
    for (let k = 0; k < zs.length - 1; k++) {
      const a = zs[k],
        b = zs[k + 1];
      const pa = k === 0 ? a : a + 0.62,
        pb = k === zs.length - 2 ? b : b - 0.62;
      const w = pb - pa;
      arch(ctx, { axis: 'z', c: (pa + pb) / 2, w, y0: MB.YC, rise: Math.min(w / 2, MB.YS - MB.YC - 0.36), ring: 0.36, t0: x - 0.3, t1: x + 0.3, top: MB.YS, clip: [a, b], cam: false });
    }
    // las pilastras de los extremos (donde la arquería nace del muro)
    pilaster(ctx, MB.z0, x, 's', Y1, MB.YC, { room: ROOM, tint: AT, w: 0.6, d: 0.2 });
    pilaster(ctx, MB.z1, x, 'n', Y1, MB.YC, { room: ROOM, tint: AT, w: 0.6, d: 0.2 });
  }
  // las bóvedas: la de la nave (sigue sobre la capilla) y las laterales
  const nave = { x0: xa, x1: xb };
  barrelVault(ctx, { x0: nave.x0, x1: nave.x1, z0: CH.z0, z1: MB.z1, axis: 'z', ys: MB.YS, rise: 2.0, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
  lunette(ctx, { axis: 'z', at: CH.z0, c: (xa + xb) / 2, span: xb - xa, ys: MB.YS, rise: 2.0, face: 1, mat: 'ashlar', tint: OT, room: ROOM });
  lunette(ctx, { axis: 'z', at: MB.z1, c: (xa + xb) / 2, span: xb - xa, ys: MB.YS, rise: 2.0, face: -1, mat: 'ashlar', tint: OT, room: ROOM });
  crown(ctx, xa, CH.z0, xb, MB.z1, MB.YS + 2.0);
  for (const [a, b] of [
    [MB.x0, xa],
    [xb, MB.x1],
  ]) {
    barrelVault(ctx, { x0: a, x1: b, z0: MB.z0, z1: MB.z1, axis: 'z', ys: MB.YS, rise: 1.6, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: MB.z0, c: (a + b) / 2, span: b - a, ys: MB.YS, rise: 1.6, face: 1, mat: 'ashlar', tint: OT, room: ROOM });
    lunette(ctx, { axis: 'z', at: MB.z1, c: (a + b) / 2, span: b - a, ys: MB.YS, rise: 1.6, face: -1, mat: 'ashlar', tint: OT, room: ROOM });
    crown(ctx, a, MB.z0, b, MB.z1, MB.YS + 1.6);
  }
  // los fajones de la nave sobre cada pareja de columnas, y el arco triunfal
  // de la capilla, más grueso
  for (const z of MB.cols) arch(ctx, { axis: 'x', c: (xa + xb) / 2, w: xb - xa - 0.4, y0: MB.YS, rise: 1.78, ring: 0.3, t0: z - 0.25, t1: z + 0.25, cam: false });
  arch(ctx, { axis: 'x', c: (xa + xb) / 2, w: xb - xa - 0.5, y0: MB.YS, rise: 1.72, ring: 0.42, t0: CH.z1 - 0.4, t1: CH.z1 + 0.4, cam: false });
  for (const x of [xa + 0.3, xb - 0.3]) pilaster(ctx, x, CH.z1, x < -74 ? 'e' : 'w', CH.y, MB.YS, { room: ROOM, tint: AT, w: 0.8, d: 0.2 });
  // los dos peldaños de la capilla
  stairs(ctx, -74, Y1, -166.1, 'n', 6, 2, 0.3, 0.45, 'ashlar', { solidBelow: true });

  // --- la capilla: el altar, la tumba del santo y su imagen, velas y la
  // corona de velas colgada de la bóveda
  const cx = (CH.x0 + CH.x1) / 2;
  P.candleAltar(ctx, cx, CH.y, CH.z0 + 1.6, 0, ROOM);
  P.veiledStatue(ctx, cx, CH.y, CH.z0 + 0.55, 0, { ped: 1.1, veil: 'clothWhite' });
  P.sarcophagus(ctx, cx, CH.y, -170.2, Math.PI / 2, { effigy: true, room: ROOM });
  P.candleCrown(ctx, cx, CH.y + 3.6, -170.2, MB.YS + 2.0 - 0.3, { room: ROOM, r: 1.0, n: 10, radius: 9, intensity: 1.0 });
  for (const [x, z, n, s] of [
    [CH.x0 + 0.6, CH.z0 + 0.7, 9, 4720],
    [CH.x1 - 0.6, CH.z0 + 0.7, 9, 4721],
    [CH.x0 + 0.7, -168.2, 6, 4722],
    [CH.x1 - 0.7, -168.4, 5, 4723],
    [cx - 1.2, -168.6, 4, 4724],
  ])
    P.candles(ctx, x, CH.y, z, n, s, { room: ROOM, radius: 5, intensity: 1.0 });
  P.banner(ctx, CH.x0 + 0.08, CH.y + 3.2, -171, Math.PI / 2, 'bannerRed', 1.1, 2.4);
  P.banner(ctx, CH.x1 - 0.08, CH.y + 3.2, -171, -Math.PI / 2, 'bannerRed', 1.1, 2.4);
  plaque(ctx, CH.x0 + 0.06, CH.y + 1.5, -169.2, 'e', 1.0, 0.7);
  const PA = DEEP.paio;
  L.interact.push(
    { kind: 'altar', id: 'a_martin', name: 'Capilla de San Martín', x: cx, y: CH.y, z: CH.z0 + 1.6, spawn: [cx, CH.y, -172.4], yaw: Math.PI },
    { kind: 'note', id: 'n_martin', note: 'sanmartin', x: CH.x0 + 0.4, y: CH.y + 1.4, z: -169.2, model: 'wall', r: 1.8 },
    // Dom Paio (game/paio.js): hablarle (el interactuable le sigue) y, cuando
    // se va al pozo, su breviario donde rezaba
    { kind: 'npc', id: 't_paio', npc: 'paio', label: 'Hablar con Dom Paio', x: PA.x, y: CH.y, z: PA.z },
    { kind: 'note', id: 'n_paio', note: 'paio', x: PA.x - 0.15, y: CH.y + 0.02, z: PA.z - 0.35, model: 'book' }
  );

  // --- la nave: lámparas colgadas, velas al pie de las columnas, sepulcros
  // de los monjes en las naves laterales y estandartes
  for (const z of [-164, -158, -152, -146, -140, -134, -128, -122]) P.hangingLamp(ctx, (xa + xb) / 2, MB.YS + 2.0 - 0.1, z, { room: ROOM, len: 1.8, radius: 8, intensity: 1.0 });
  for (const z of [-156, -138, -124]) ctx.lights.push({ x: (xa + xb) / 2, y: Y1 + 3.0, z, r: 1, g: 0.62, b: 0.36, radius: 14, intensity: 0.35, room: ROOM });
  for (const [x, z, s] of [
    [xa + 0.7, -152.8, 4730],
    [xb - 0.7, -140.6, 4731],
    [xa + 0.7, -128.8, 4732],
    [xb - 0.7, -122.4, 4733],
  ])
    P.candles(ctx, x, Y1, z, 4, s, { room: ROOM, radius: 3.5, intensity: 0.7, spread: 0.25 });
  for (const [x, z, rot] of [
    [MB.x0 + 1.0, -158, Math.PI / 2],
    [MB.x0 + 1.0, -128, Math.PI / 2],
    [MB.x1 - 1.0, -134, Math.PI / 2],
    [MB.x1 - 1.0, -128, Math.PI / 2],
  ])
    P.sarcophagus(ctx, x, Y1, z, rot, { room: ROOM, l: 1.0, w: 0.45 });
  for (const z of [-164, -158, -134, -122]) P.wallTorch(ctx, MB.x0, Y1 + 2.4, z, 'e', { room: ROOM, radius: 7 });
  for (const z of [-164, -157.8, -140]) P.wallTorch(ctx, MB.x1, Y1 + 2.4, z, 'w', { room: ROOM, radius: 7 });
  P.banner(ctx, MB.x0 + 0.08, MB.YS - 0.3, -152, Math.PI / 2, 'bannerRed', 1.2, 2.6);
  P.bones(ctx, -80.4, Y1, -121.2, 7, 4734, 0.6);
  bakeCorpse(ctx.wb, -66.2, Y1, -158.6, -1.2, 'curl', 'villager', 4735);
  ctx.rats.push({ x: -82.6, y: Y1, z: -164.8, n: 2 });

  // --- el osario: muros y bóveda de calaveras, el altar de huesos al fondo
  const ocz = (OS.z0 + OS.z1) / 2,
    ospan = OS.z1 - OS.z0;
  const OYS = Y1 + 2.6;
  barrelVault(ctx, { x0: OS.x0, x1: OS.x1, z0: OS.z0, z1: OS.z1, axis: 'x', ys: OYS, rise: 2.0, mat: 'skulls', tint: [0.74, 0.71, 0.67], room: ROOM, sub: 1.0, impostTint: AT });
  lunette(ctx, { axis: 'x', at: OS.x0, c: ocz, span: ospan, ys: OYS, rise: 2.0, face: 1, mat: 'skulls', tint: ST, room: ROOM });
  lunette(ctx, { axis: 'x', at: OS.x1, c: ocz, span: ospan, ys: OYS, rise: 2.0, face: -1, mat: 'skulls', tint: ST, room: ROOM, hole: { u0: -147.9, u1: -144.1, y: MB.YS } });
  crown(ctx, OS.x0, OS.z0, OS.x1, OS.z1, OYS + 2.0);
  arch(ctx, { axis: 'z', c: -146, w: 3.2, y0: Y1 + 1.6, rise: 1.9, ring: 0.3, t0: OS.x1, t1: MB.x0, top: MB.YS, clip: [-147.9, -144.1], spMat: 'skulls', spTint: ST });
  for (const z of [OS.z0 + 0.06, OS.z1 - 0.06]) P.boneWall(ctx, (OS.x0 + OS.x1) / 2 - 0.4, Y1, z, z < ocz ? 0 : Math.PI, OS.x1 - OS.x0 - 1.4, 2.5, { room: ROOM, seed: Math.round(-z * 3) });
  wb.box('ashlar', OS.x0 + 0.2, Y1, ocz - 1.1, OS.x0 + 1.2, Y1 + 1.0, ocz + 1.1, { faces: 'tnsew', ao: false, room: ROOM, tint: AT });
  ctx.col.add(OS.x0 + 0.2, Y1, ocz - 1.1, OS.x0 + 1.2, Y1 + 1.0, ocz + 1.1);
  P.skullRow(ctx, OS.x0 + 0.7, Y1 + 1.0, ocz, Math.PI / 2, 6, { room: ROOM, gap: 0.3 });
  for (const y of [Y1 + 1.5, Y1 + 1.9]) P.skullRow(ctx, OS.x0 + 0.12, y, ocz, Math.PI / 2, 7, { room: ROOM, gap: 0.28 });
  P.candles(ctx, OS.x0 + 0.7, Y1 + 1.0, ocz - 0.7, 5, 4740, { room: ROOM, radius: 4.5, intensity: 0.9, spread: 0.2 });
  P.hangingLamp(ctx, ocz < 0 ? -89.5 : -89.5, OYS + 2.0 - 0.1, ocz, { room: ROOM, len: 1.4, radius: 6, intensity: 0.8 });
  P.bones(ctx, -88.4, Y1, -148.6, 12, 4741, 0.9);
  plaque(ctx, OS.x0 + 0.06, Y1 + 2.0, ocz, 'e', 1.2, 0.5);
  L.interact.push({ kind: 'note', id: 'n_osario', note: 'osario', x: OS.x0 + 1.5, y: Y1 + 1.3, z: ocz + 1.4, model: 'wall', r: 1.8 });

  // --- el Pórtico de los Velados: el arco por el grueso del muro y, en la
  // cripta, su inscripción
  arch(ctx, { axis: 'z', c: PT.z, w: PT.w, y0: PT.y0, rise: PT.rise, ring: 0.36, t0: -64, t1: -62, top: MB.YS, clip: [PT.z - PT.w / 2 - 0.36, PT.z + PT.w / 2 + 0.36], spTint: DT });
  plaque(ctx, MB.x1 - 0.06, Y1 + 1.7, PT.z - 3.6, 'w', 1.0, 0.7);
  L.interact.push({ kind: 'note', id: 'n_velados', note: 'velados', x: MB.x1 - 0.4, y: Y1 + 1.4, z: PT.z - 3.6, model: 'wall', r: 1.8 });
  // (de la antesala llega la luz roja)
  ctx.lights.push({ x: MB.x1 - 1.2, y: Y1 + 2.2, z: PT.z, r: 1, g: 0.3, b: 0.16, radius: 7, intensity: 0.8, room: ROOM });

  // --- los arcos de la sala de los obispos (por el grueso del muro)
  for (const [c, w] of ARCADE) arch(ctx, { axis: 'z', c, w, y0: Y1 + 1.6, rise: w / 2, ring: 0.3, t0: -64, t1: -62, top: MB.YS, clip: [c - w / 2 - 0.3, c + w / 2 + 0.3] });

  // --- la puerta del atajo de los Inocentes (atrancada desde abajo), su
  // escalera y su bóveda
  arch(ctx, { axis: 'x', c: -74, w: 3, y0: Y1 + 2.4, rise: 1.2, ring: 0.3, t0: MB.z1, t1: MB.z1 + 0.15, top: MB.YS, clip: [-75.8, -72.2] });
  stairs(ctx, -74, YI, -112.25, 'n', 3, 15, 0.3, 0.45, 'flag', { solidBelow: true });
  rampVault(ctx, { x0: -75.5, x1: -72.5, z0: MB.z1, z1: -112.25, ys0: Y1 + 2.4, ys1: YI + 2.4, rise: 1.2, mat: 'rock', tint: RK, room: ROOM });
  barrelVault(ctx, { x0: -75.5, x1: -72.5, z0: -112.25, z1: -108, axis: 'z', ys: YI + 2.4, rise: 1.2, mat: 'rock', tint: RK, room: ROOM, sub: 1.0, impostTint: AT });
  L.interact.push({ kind: 'door', id: 'd_atajo_martin', x: -74, y: Y1, z: MB.z1 + 0.1, w: 3, h: 2.4, axis: 'x', lock: { type: 'barred', side: 1 }, mat: 'planks', hinge: -1, swing: -1, plane: MB.z1, inset: 0.1 });
  void rng;
}

// ------------------------------------------------------------ la antesala
// La basílica del dios sin nombre. Se entra por el pórtico a la tribuna, que
// domina la sala entera y su eje, hasta la puerta; la escalinata baja a la
// nave (la niebla de los Velados, a su pie), con sus arquerías, sus fajones,
// las estatuas veladas de las naves laterales y, al fondo, el estrado con la
// puerta, los Velados y el incensario.
function buildAntesala(ctx, L) {
  const wb = ctx.wb;
  const D = DEEP;
  const H = D.hall,
    S = D.stair,
    Ds = D.dais,
    DS = D.daisStair,
    TR = D.terrace,
    PT = D.portal,
    PS = D.pozoStair;
  const YC = H.YC,
    YS = H.YS;
  const [zA, zB] = H.rows;
  // la escalinata (baja hacia levante) y sus pretiles: un muro que baja
  // escalón a escalón, con sus pilares
  stairs(ctx, S.x1, DY, S.z, 'w', S.w, S.n, (Y1 - DY) / S.n, (S.x1 - S.x0) / S.n, 'ashlar', { solidBelow: true });
  const run = (S.x1 - S.x0) / S.n,
    rise = (Y1 - DY) / S.n;
  for (const s of [-1, 1]) {
    const z = S.z + s * (S.w / 2 + 0.25);
    for (let i = 0; i < S.n; i += 2) {
      const xa = S.x1 - (i + 2) * run,
        xb = S.x1 - i * run;
      wb.box('ashlar', xa, DY, z - 0.25, xb, DY + (i + 2) * rise + 0.95, z + 0.25, { faces: 'tnsew', ao: false, room: ROOM, tint: AT, sub: 2 });
    }
    for (let i = 0; i <= S.n; i += 4) {
      const x = S.x1 - i * run;
      wb.box('ashlar', x - 0.32, DY, z - 0.34, x + 0.32, DY + Math.min(S.n, i + 1) * rise + 1.25, z + 0.34, { faces: 'tnsew', ao: false, room: ROOM, tint: [0.92, 0.89, 0.83] });
    }
    ctx.col.add(S.x0, DY, z - 0.25, S.x1, Y1 + 1.0, z + 0.25);
  }
  // la tribuna: su antepecho (salvo la escalinata) y la cornisa de su frente
  parapet(ctx, 'z', TR.x1 + 0.15, H.z0, S.z - S.w / 2 - 0.5, Y1);
  parapet(ctx, 'z', TR.x1 + 0.15, S.z + S.w / 2 + 0.5, H.z1, Y1);
  wb.box('ashlar', TR.x1, Y1 - 0.3, H.z0, TR.x1 + 0.12, Y1, H.z1, { faces: 'eb', ao: false, room: ROOM, tint: AT });
  // el estrado: su cornisa, su balaustrada (con el hueco de la escalera) y
  // la escalera
  stairs(ctx, DS.x0, DY, DS.z, 'e', DS.w, DS.n, (AY - DY) / DS.n, (DS.x1 - DS.x0) / DS.n, 'ashlar', { solidBelow: true });
  wb.box('ashlar', Ds.x0 - 0.12, AY - 0.25, Ds.z0 - 0.12, Ds.x1, AY, Ds.z1 + 0.12, { faces: 'nsw', ao: false, room: ROOM, tint: AT });
  const bal = (x0, z0, x1, z1) => {
    wb.box('ashlar', x0, AY, z0, x1, AY + 0.95, z1, { faces: 'tnsew', ao: false, room: ROOM, tint: AT, sub: 2 });
    ctx.col.add(x0, AY, z0, x1, AY + 1.0, z1);
  };
  bal(Ds.x0, Ds.z0, Ds.x0 + 0.3, DS.z - DS.w / 2);
  bal(Ds.x0, DS.z + DS.w / 2, Ds.x0 + 0.3, Ds.z1);
  bal(Ds.x0 + 0.3, Ds.z0, Ds.x1 - 0.5, Ds.z0 + 0.3);
  bal(Ds.x0 + 0.3, Ds.z1 - 0.3, Ds.x1 - 0.5, Ds.z1);
  // las columnas (las del estrado, más cortas) y las arquerías
  for (const z of [zA, zB]) {
    for (const x of H.cols) {
      const y0 = x > Ds.x0 ? AY : DY;
      P.column(ctx, x, y0, z, YC - y0, 0.6, { mat: 'ashlar' });
    }
    const xs = [H.x0, ...H.cols, H.x1];
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k],
        b = xs[k + 1];
      const pa = k === 0 ? a : a + 0.6,
        pb = k === xs.length - 2 ? b : b - 0.6;
      const w = pb - pa;
      archRing(ctx, { axis: 'x', c: (pa + pb) / 2, w, y0: YC, rise: Math.min(w / 2, YS - YC), ring: 0.36, t0: z - 0.35, t1: z + 0.35, top: YS, clip: [a, b], mat: 'ashlar', spMat: 'ashlar', room: ROOM, tint: AT, spTint: DT, cam: false });
    }
  }
  // las bóvedas: la de la nave (alta) y las de las naves laterales, con sus
  // lunetos (en el de poniente, el pórtico)
  barrelVault(ctx, { x0: H.x0, x1: H.x1, z0: zA, z1: zB, axis: 'x', ys: YS, rise: 3.0, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
  barrelVault(ctx, { x0: H.x0, x1: H.x1, z0: H.z0, z1: zA, axis: 'x', ys: YS, rise: 1.5, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
  barrelVault(ctx, { x0: H.x0, x1: H.x1, z0: zB, z1: H.z1, axis: 'x', ys: YS, rise: 1.5, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
  for (const at of [H.x0, H.x1]) {
    const f = at === H.x0 ? 1 : -1;
    const hole = at === H.x0 ? { u0: PT.z - PT.w / 2 - 0.36, u1: PT.z + PT.w / 2 + 0.36, y: D.martin.YS } : undefined;
    lunette(ctx, { axis: 'x', at, c: (zA + zB) / 2, span: zB - zA, ys: YS, rise: 3.0, face: f, mat: 'ashlar', tint: DT, room: ROOM, hole });
    lunette(ctx, { axis: 'x', at, c: (H.z0 + zA) / 2, span: zA - H.z0, ys: YS, rise: 1.5, face: f, mat: 'ashlar', tint: DT, room: ROOM });
    lunette(ctx, { axis: 'x', at, c: (zB + H.z1) / 2, span: H.z1 - zB, ys: YS, rise: 1.5, face: f, mat: 'ashlar', tint: DT, room: ROOM });
  }
  // los fajones sobre cada pareja de columnas
  for (const x of H.cols) archRing(ctx, { axis: 'z', c: (zA + zB) / 2, w: zB - zA - 0.4, y0: YS, rise: 2.75, ring: 0.34, t0: x - 0.3, t1: x + 0.3, mat: 'ashlar', room: ROOM, tint: AT, cam: false });
  ctx.col.addCam(H.x0, YS + 3.0, zA, H.x1, YS + 3.4, zB);
  ctx.col.addCam(H.x0, YS + 1.5, H.z0, H.x1, YS + 1.9, zA);
  ctx.col.addCam(H.x0, YS + 1.5, zB, H.x1, YS + 1.9, H.z1);
  // pilastras en los muros de las naves laterales, frente a las columnas
  for (const x of H.cols) {
    pilaster(ctx, H.z0, x, 's', DY, YS, { room: ROOM, tint: AT, w: 0.7, d: 0.2 });
    pilaster(ctx, H.z1, x, 'n', DY, YS, { room: ROOM, tint: AT, w: 0.7, d: 0.2 });
  }
  // el suelo de la nave: una alfombra de mosaico de la escalinata al estrado
  wb.box('mosaic', S.x1, DY + 0.005, zA + 1.2, DS.x0, DY + 0.012, zB - 1.2, { faces: 't', ao: false, room: ROOM, uv: 0.2, tint: [0.8, 0.5, 0.45] });
  // los velados colosales: dos guardan el pórtico en la tribuna; los de las
  // naves laterales, de espaldas al muro (al norte, el tramo de la escalera
  // del pozo queda libre)
  for (const s of [-1, 1]) giantVeiled(ctx, TR.x0 + 1.6, Y1, PT.z + s * (PT.w / 2 + 1.6), Math.PI / 2, 0.9);
  for (const x of [-50.5, -43.5, -36.5, -29.5]) {
    if (x !== -36.5) giantVeiled(ctx, x, DY, H.z0 + 1.3, 0, 1.0);
    giantVeiled(ctx, x, DY, H.z1 - 1.3, Math.PI, 1.0);
  }
  // estandartes: negros al norte, rojos al sur (y uno sobre la reja del pozo)
  for (const x of [-22.5]) {
    P.banner(ctx, x, YS - 0.2, H.z0 + 0.08, 0, 'bannerBlack', 1.3, 3.6);
    P.banner(ctx, x, YS - 0.2, H.z1 - 0.08, Math.PI, 'bannerRed', 1.3, 3.6);
  }
  P.banner(ctx, -36.5, YS - 0.2, H.z0 + 0.08, 0, 'bannerBlack', 1.6, 3.4);
  for (const z of [H.z0 + 3.2, H.z1 - 3.2]) P.banner(ctx, TR.x0 + 0.08, YS - 0.2, z, Math.PI / 2, z < -152 ? 'bannerBlack' : 'bannerRed', 1.3, 3.0);
  // braseros: al pie de la escalinata, al pie del estrado y en la tribuna
  P.brazier(ctx, DS.x0 - 2.6, DY, DS.z - DS.w / 2 - 0.9, { room: ROOM, radius: 10, s: 1.3 });
  P.brazier(ctx, DS.x0 - 2.6, DY, DS.z + DS.w / 2 + 0.9, { room: ROOM, radius: 10, s: 1.3 });
  P.brazier(ctx, TR.x0 + 1.2, Y1, H.z0 + 1.2, { room: ROOM, radius: 8 });
  P.brazier(ctx, TR.x0 + 1.2, Y1, H.z1 - 1.2, { room: ROOM, radius: 8 });
  // (la avenida de fuego: un brasero al pie de cada columna de la nave, que
  // lleva la vista de la tribuna a la puerta)
  for (const x of [-47, -40]) for (const z of [zA + 1.4, zB - 1.4]) P.brazier(ctx, x, DY, z, { room: ROOM, radius: 9, s: 1.1 });
  for (const x of [-44, -30]) P.candleCrown(ctx, x, YS + 0.6, (zA + zB) / 2, YS + 3.0 - 0.25, { room: ROOM, r: 1.3, n: 12, radius: 12, intensity: 1.0 });
  for (const [x, z] of [
    [-50, H.z0 + 4],
    [-50, H.z1 - 4],
    [-30, H.z0 + 4],
    [-30, H.z1 - 4],
  ])
    ctx.lights.push({ x, y: DY + 3.5, z, r: 0.95, g: 0.42, b: 0.26, radius: 14, intensity: 0.45, room: ROOM });
  // velas en los escalones, junto a los pretiles, y en el estrado
  for (let i = 2; i < S.n; i += 3) {
    const x = S.x1 - (i + 0.5) * run;
    const yy = DY + (i + 1) * rise;
    P.candles(ctx, x, yy, S.z + ((i / 3) % 2 ? -1 : 1) * (S.w / 2 - 0.35), 3, 4470 + i, { room: ROOM, radius: 3, intensity: 0.5, spread: 0.12 });
  }
  for (const z of [Ds.z0 + 2, Ds.z1 - 2]) P.brazier(ctx, Ds.x1 - 1.6, AY, z, { room: ROOM, radius: 9, s: 1.25 });
  P.candles(ctx, Ds.x0 + 0.6, AY, Ds.z0 + 0.8, 9, 4490, { room: ROOM, radius: 5, intensity: 1.0, spread: 0.5 });
  P.candles(ctx, Ds.x0 + 0.6, AY, Ds.z1 - 0.8, 9, 4491, { room: ROOM, radius: 5, intensity: 1.0, spread: 0.5 });
  // la puerta del dios: el marco colosal, el dintel con DEO IGNOTO (lo
  // escribe el juego) y las tres cabezas que lloran sangre; las hojas, los
  // círculos y la cerradura los pone game/crypt.js
  const DR = D.door;
  const z0 = DR.z - DR.w / 2,
    z1 = DR.z + DR.w / 2;
  const xf = H.x1 - 0.02;
  wb.box('ashlar', xf - 0.5, AY, z0 - 0.9, xf, AY + DR.h + 0.2, z0, { faces: 'wns', ao: false, room: ROOM, tint: AT, sub: 2 });
  wb.box('ashlar', xf - 0.5, AY, z1, xf, AY + DR.h + 0.2, z1 + 0.9, { faces: 'wns', ao: false, room: ROOM, tint: AT, sub: 2 });
  ctx.col.add(xf - 0.5, AY, z0 - 0.9, xf, AY + DR.h + 0.2, z0);
  ctx.col.add(xf - 0.5, AY, z1, xf, AY + DR.h + 0.2, z1 + 0.9);
  wb.box('ashlar', xf - 0.6, AY + DR.h, z0 - 1.1, xf, AY + DR.h + 0.75, z1 + 1.1, { faces: 'wnsb', ao: false, room: ROOM, tint: AT, sub: 2 });
  wb.box('ashlar', xf - 0.8, AY + DR.h + 0.75, z0 - 1.4, xf, AY + DR.h + 0.95, z1 + 1.4, { faces: 'wnstb', ao: false, room: ROOM, tint: AT, sub: 2 });
  // las tres cabezas sobre la cornisa: lloran sangre cuando se vacían las
  // pilas (las lágrimas las pone el juego)
  for (const z of [DR.z - 1.0, DR.z, DR.z + 1.0]) {
    const yb = AY + DR.h + 0.95;
    wb.box('ashlar', xf - 0.5, yb, z - 0.26, xf, yb + 0.62, z + 0.26, { ao: false, room: ROOM, tint: [0.62, 0.6, 0.56] });
    wb.box('ashlar', xf - 0.66, yb + 0.06, z - 0.2, xf - 0.5, yb + 0.56, z + 0.2, { ao: false, room: ROOM, tint: [0.62, 0.6, 0.56] });
    wb.box('black', xf - 0.665, yb + 0.33, z - 0.13, xf - 0.66, yb + 0.4, z - 0.04, { faces: 'w', ao: false, grime: false, room: ROOM });
    wb.box('black', xf - 0.665, yb + 0.33, z + 0.04, xf - 0.66, yb + 0.4, z + 0.13, { faces: 'w', ao: false, grime: false, room: ROOM });
    wb.box('black', xf - 0.665, yb + 0.12, z - 0.08, xf - 0.66, yb + 0.2, z + 0.08, { faces: 'w', ao: false, grime: false, room: ROOM });
  }
  // el sello sobre la puerta (en el luneto) y su resplandor
  P.decal(ctx, H.x1 - 0.03, YS + 1.3, DR.z, 3.4, 'sigil', -1, { wall: 'x' });
  ctx.lights.push({ x: H.x1 - 2.5, y: AY + 3.2, z: DR.z, r: 1, g: 0.2, b: 0.12, radius: 10, intensity: 1.0, room: ROOM });
  ctx.lights.push({ x: -36, y: DY + 4.0, z: -152, r: 0.9, g: 0.45, b: 0.3, radius: 16, intensity: 0.7, room: ROOM });
  ctx.lights.push({ x: TR.x0 + 3, y: Y1 + 2.5, z: -152, r: 0.9, g: 0.4, b: 0.25, radius: 9, intensity: 0.6, room: ROOM });
  // el incensario del estrado: el gancho en la bóveda y la peana donde
  // descansa mientras está frío (el incensario y su cadena los pone
  // game/crypt.js)
  const CE = D.censer;
  wb.box('iron', CE.x - 0.2, YS + 2.9, CE.z - 0.2, CE.x + 0.2, YS + 3.05, CE.z + 0.2, { ao: false, room: ROOM });
  wb.cylinder('ashlar', CE.x, AY, CE.z, 0.62, 0.7, 0.3, 10, { ao: false, capTop: true, room: ROOM, tint: AT });
  ctx.col.add(CE.x - 0.62, AY, CE.z - 0.62, CE.x + 0.62, AY + 0.3, CE.z + 0.62);
  // la boca de la escalera del pozo, con su reja (sube al caer los Velados)
  const pc = (PS.x0 + PS.x1) / 2;
  archRing(ctx, { axis: 'x', c: pc, w: PS.x1 - PS.x0, y0: DY + 3.0, rise: 1.2, ring: 0.3, t0: H.z0 - 0.15, t1: H.z0, top: YS, clip: [PS.x0 - 0.3, PS.x1 + 0.3], mat: 'ashlar', spMat: 'ashlar', room: ROOM, tint: AT, spTint: DT });
  L.interact.push(
    { kind: 'door', id: 'd_dios', x: H.x1 + 0.5, y: AY, z: DR.z, w: DR.w, h: DR.h, axis: 'z', lock: { type: 'god' }, mat: 'god', ix: H.x1 - 1.4, iz: DR.z, r: 2.6 },
    { kind: 'censer', id: 'x_incensario', x: CE.x, y: AY, z: CE.z, r: 2.0 },
    // (los Velados no tienen niebla: despiertan al bajar a la nave, y a la
    // espalda sale una reja del borde de la tribuna; ver game/crypt.js)
    // la niebla del arzobispo, ya dentro de la cisterna (tras la puerta)
    { kind: 'fog', id: 'f_boss', boss: 'turibulario', x: H.x1 + 1.6, y: AY, z: DR.z, w: DR.w, h: DR.h, axis: 'z', enter: 1 },
    { kind: 'door', id: 'd_reja_pozo', x: pc, y: DY, z: H.z0 + 0.12, w: PS.x1 - PS.x0, h: 3.0, axis: 'x', lock: { type: 'boss', boss: 'guardianes' }, mat: 'grate' }
  );
}

// ------------------------------------------------------------ el pozo de los condenados
// Bajo el lado norte de la antesala, «donde ya no se sube»: una sala honda de
// bóvedas de arista sobre dos pilares, con la Pila de los Condenados entre
// ellos, jaulas colgadas, cadenas y los quemados.
function buildPozo(ctx, L) {
  const wb = ctx.wb;
  const PZ = DEEP.pozo,
    PS = DEEP.pozoStair,
    F3 = DEEP.font3;
  const YS = PY + 6,
    RISE = 4;
  const PT = [0.5, 0.46, 0.42];
  const xs = [PZ.x0, PZ.x0 + 8, PZ.x0 + 16, PZ.x1],
    zs = [PZ.z0, (PZ.z0 + PZ.z1) / 2, PZ.z1];
  groinVaults(ctx, { xs, zs, ys: YS, rise: RISE, mat: 'mossstone', tint: [0.5, 0.48, 0.45], room: ROOM, walls: { n: true, s: true, e: true, w: true }, ribs: true, ribMat: 'ashlar', ribTint: PT, ribW: 0.5, ribD: 0.3 });
  crown(ctx, PZ.x0, PZ.z0, PZ.x1, PZ.z1, YS + RISE);
  // los dos pilares (cuadrados, de sillería) y las pilastras de los muros
  for (const x of [xs[1], xs[2]]) {
    const z = zs[1];
    wb.box('ashlar', x - 0.65, PY, z - 0.65, x + 0.65, YS - 0.4, z + 0.65, { sub: 2, aoH: 1.2, room: ROOM, tint: PT });
    wb.box('ashlar', x - 0.85, YS - 0.4, z - 0.85, x + 0.85, YS, z + 0.85, { ao: false, room: ROOM, tint: AT });
    wb.box('ashlar', x - 0.85, PY, z - 0.85, x + 0.85, PY + 0.4, z + 0.85, { ao: false, room: ROOM, tint: AT });
    ctx.col.add(x - 0.85, PY, z - 0.85, x + 0.85, YS, z + 0.85);
  }
  for (const x of [xs[1], xs[2]]) {
    pilaster(ctx, PZ.z0, x, 's', PY, YS, { room: ROOM, tint: PT, w: 0.9, d: 0.25 });
    if (Math.abs(x - (PS.x0 + PS.x1) / 2) > 3) pilaster(ctx, PZ.z1, x, 'n', PY, YS, { room: ROOM, tint: PT, w: 0.9, d: 0.25 });
  }
  pilaster(ctx, PZ.x0, zs[1], 'e', PY, YS, { room: ROOM, tint: PT, w: 0.9, d: 0.25 });
  pilaster(ctx, PZ.x1, zs[1], 'w', PY, YS, { room: ROOM, tint: PT, w: 0.9, d: 0.25 });
  // la escalera desde la antesala y su rellano
  const pc = (PS.x0 + PS.x1) / 2;
  stairs(ctx, pc, PY, PS.z0, 's', PS.x1 - PS.x0, PS.n, (DY - PY) / PS.n, (PS.z1 - PS.z0) / PS.n, 'ashlar', { solidBelow: true });
  rampVault(ctx, { x0: PS.x0, x1: PS.x1, z0: PS.z0, z1: PS.z1, ys0: PY + 3.0, ys1: DY + 3.0, rise: 1.2, mat: 'ashlar', tint: [0.56, 0.52, 0.48], room: ROOM });
  barrelVault(ctx, { x0: PS.x0, x1: PS.x1, z0: PZ.z1, z1: PS.z0, axis: 'z', ys: PY + 3.0, rise: 1.2, mat: 'ashlar', tint: [0.56, 0.52, 0.48], room: ROOM, sub: 1.0, impostTint: AT });
  // las jaulas colgadas de las claves, con sus huesos
  const fx = (F3.x0 + F3.x1) / 2,
    fz = (F3.z0 + F3.z1) / 2;
  for (const [x, z, y] of [
    [PZ.x0 + 4, PZ.z0 + 5, PY + 3.4],
    [PZ.x1 - 4, PZ.z0 + 5, PY + 2.6],
    [PZ.x0 + 4, PZ.z1 - 5, PY + 3.0],
    [PZ.x1 - 4, PZ.z1 - 4.5, PY + 4.2],
  ]) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      wb.box('iron', x + Math.cos(a) * 0.6 - 0.025, y, z + Math.sin(a) * 0.6 - 0.025, x + Math.cos(a) * 0.6 + 0.025, y + 2.0, z + Math.sin(a) * 0.6 + 0.025, { ao: false, room: ROOM });
    }
    wb.cylinder('iron', x, y, z, 0.66, 0.66, 0.06, 8, { ao: false, capTop: true, capBot: true, room: ROOM });
    wb.cylinder('iron', x, y + 2.0, z, 0.66, 0.4, 0.3, 8, { ao: false, capTop: true, room: ROOM });
    const top = YS + RISE * 0.7;
    for (let c = 0; c < Math.round((top - y - 2.3) / 0.14); c++) wb.box('iron', x - 0.03, y + 2.3 + c * 0.14, z - 0.03, x + 0.03, y + 2.4 + c * 0.14, z + 0.03, { ao: false, room: ROOM });
    P.bones(ctx, x, y + 0.06, z, 4, Math.round(x * 11 - z), 0.3);
  }
  // los quemados, las cadenas de los muros, el brasero y la carne que sube
  bakeCorpse(ctx.wb, fx - 5.6, PY, fz + 4.2, 0.7, 'back', 'burnt', 4750);
  bakeCorpse(ctx.wb, fx + 6.2, PY, fz - 5.0, -2.2, 'face', 'burnt', 4751);
  bakeCorpse(ctx.wb, PZ.x0 + 1.4, PY, fz - 3, 1.6, 'sit', 'burnt', 4752);
  for (const z of [fz - 6, fz + 6]) for (const dz of [-0.4, 0.4]) P.chains(ctx, PZ.x0 + 0.1, PY + 2.8, z + dz, 12, 0);
  for (const [x, z] of [
    [PZ.x1 - 2.2, PZ.z1 - 2.2],
    [PZ.x0 + 2.2, PZ.z0 + 2.2],
    [PZ.x0 + 2.2, PZ.z1 - 2.2],
    [PZ.x1 - 2.2, PZ.z0 + 2.2],
  ])
    P.brazier(ctx, x, PY, z, { room: ROOM, radius: 10 });
  // (la escalera: una antorcha a media bajada y otra en el rellano)
  P.wallTorch(ctx, PS.x0, (DY + PY) / 2 + 2.0, (PS.z0 + PS.z1) / 2, 'e', { room: ROOM, radius: 6 });
  P.wallTorch(ctx, PS.x1, PY + 2.2, (PZ.z1 + PS.z0) / 2, 'w', { room: ROOM, radius: 6 });
  P.fleshGrowth(ctx, fx, PY, PZ.z0 + 0.4, 1.8, 4452, { room: ROOM, climb: 3.5, lift: 1.6, bound: [fx - 6, fx + 6, PZ.z0 - 0.5, PZ.z0 + 2.5] });
  P.bones(ctx, fx - 3.5, PY, fz + 2.5, 10, 4753, 1.2);
  ctx.lights.push({ x: fx, y: PY + 2.5, z: fz, r: 0.8, g: 0.15, b: 0.08, radius: 13, intensity: 1.0, room: ROOM });
  void L;
}

// ------------------------------------------------------------ las catacumbas de la Sé
// Bajo la sala de los obispos: la necrópolis de los canónigos. Galerías
// cortas con nichos en tres alturas; cubículos con su arcosolio; el cruce de
// los huesos; el lucernario, con su pozo de luz y el oratorio de San Pedro de
// Rates (un altar donde descansar); la escalera de la sala de llegada (cuya
// puerta se abre desde aquí) y la que baja a los Inocentes.
function buildCatacumbas(ctx, L, byId) {
  const wb = ctx.wb;
  // --- el lucernario: el techo con su pozo de luz, que sube hasta la reja de
  // la calle
  const LU = byId('lucernario').r;
  const top = YC + 3.6;
  const sx = -34.5,
    sz = -93.5,
    sh = 1.2;
  const lcx = (LU[0] + LU[2]) / 2,
    lcz = (LU[1] + LU[3]) / 2;
  for (const [a, b, c, d] of subtractRects([LU[0], LU[1], LU[2], LU[3]], [[sx - sh, sz - sh, sx + sh, sz + sh]])) {
    wb.box('rock', a, top, b, c, top + 0.3, d, { faces: 'b', ao: false, sub: 2, room: ROOM, tint: RK });
    ctx.col.add(a, top, b, c, top + 0.5, d).cam = true;
  }
  // el pozo: cuatro caras hacia dentro, hasta la reja de lo alto
  const yTop = -1.6;
  wb.box('rock', sx - sh, top, sz - sh - 0.05, sx + sh, yTop, sz - sh, { faces: 's', ao: false, room: ROOM, tint: RK });
  wb.box('rock', sx - sh, top, sz + sh, sx + sh, yTop, sz + sh + 0.05, { faces: 'n', ao: false, room: ROOM, tint: RK });
  wb.box('rock', sx - sh - 0.05, top, sz - sh, sx - sh, yTop, sz + sh, { faces: 'e', ao: false, room: ROOM, tint: RK });
  wb.box('rock', sx + sh, top, sz - sh, sx + sh + 0.05, yTop, sz + sh, { faces: 'w', ao: false, room: ROOM, tint: RK });
  ctx.col.addCam(sx - sh, top + 1.5, sz - sh, sx + sh, yTop, sz + sh);
  for (let k = 0; k <= 6; k++) wb.box('iron', sx - sh + (k * 2 * sh) / 6 - 0.03, yTop - 0.06, sz - sh, sx - sh + (k * 2 * sh) / 6 + 0.03, yTop, sz + sh, { ao: false, room: ROOM });
  wb.box('black', sx - sh, yTop + 0.05, sz - sh, sx + sh, yTop + 0.06, sz + sh, { faces: 'b', ao: false, grime: false, room: ROOM });
  // la luz pálida que baja (y el charco, el musgo y las hierbas debajo)
  if (ctx.shafts) ctx.shafts.push({ a: [sx, yTop - 0.2, sz], b: [sx + 0.3, YC, sz + 0.2], w: 2.0, color: 0x9fb4d8 });
  ctx.lights.push({ x: sx, y: YC + 1.4, z: sz, r: 0.55, g: 0.62, b: 0.82, radius: 7, intensity: 0.9, room: ROOM });
  wb.box('water', sx - 1.1, YC + 0.01, sz - 0.9, sx + 1.2, YC + 0.02, sz + 1.0, { faces: 't', ao: false, grime: false, room: ROOM });
  P.weeds(ctx, sx - 1.3, YC, sz + 1.1, 7, 4760, 0.6);
  P.weeds(ctx, sx + 1.3, YC, sz - 1.0, 5, 4761, 0.5);
  // el oratorio de San Pedro de Rates, en el rincón del noreste: el altar,
  // la pintura del santo (borrosa) y velas
  P.candleAltar(ctx, LU[2] - 0.55, YC, -97.3, -Math.PI / 2, ROOM);
  plaque(ctx, LU[2] - 0.06, YC + 2.3, -97.3, 'w', 1.2, 0.8);
  P.candles(ctx, LU[2] - 0.6, YC, -98.4, 7, 4762, { room: ROOM, radius: 5, intensity: 1.0 });
  P.candles(ctx, LU[0] + 0.6, YC, LU[1] + 0.6, 5, 4763, { room: ROOM, radius: 4, intensity: 0.7 });
  P.hangingLamp(ctx, lcx - 3, top - 0.05, lcz + 3, { room: ROOM, len: 0.9, radius: 6, intensity: 0.8 });
  ctx.lights.push({ x: lcx, y: YC + 2.0, z: lcz, r: 1, g: 0.62, b: 0.36, radius: 9, intensity: 0.5, room: ROOM });
  L.interact.push(
    { kind: 'altar', id: 'a_oratorio', name: 'Oratorio de San Pedro de Rates', x: LU[2] - 0.55, y: YC, z: -97.3, spawn: [LU[2] - 2.2, YC, -97.3], yaw: Math.PI / 2 },
    { kind: 'note', id: 'n_rates', note: 'rates', x: LU[2] - 0.4, y: YC + 1.6, z: -95.8, model: 'wall', r: 1.8 }
  );
  // pilares en las esquinas del lucernario (sostienen el techo junto al pozo)
  for (const [x, z] of [
    [sx - 3.4, sz - 3.4],
    [sx + 3.4, sz - 3.4],
    [sx - 3.4, sz + 3.4],
    [sx + 3.4, sz + 3.4],
  ]) {
    wb.box('rock', x - 0.45, YC, z - 0.45, x + 0.45, top, z + 0.45, { sub: 2, aoH: 1, room: ROOM, tint: RK });
    ctx.col.add(x - 0.45, YC, z - 0.45, x + 0.45, top, z + 0.45);
  }
  // (exvotos al pie de los dos del este, los que se ven al entrar)
  P.candles(ctx, sx + 3.4 + 0.75, YC, sz + 3.4 + 0.7, 5, 4764, { room: ROOM, radius: 4, intensity: 0.8 });
  P.candles(ctx, sx + 3.4 + 0.75, YC, sz - 3.4 - 0.7, 4, 4765, { room: ROOM, radius: 3.5, intensity: 0.6 });

  // --- los cubículos: el arcosolio del fondo, frescos borrados y velas
  for (const [id, r, d] of CUBICULA) {
    const cx = (r[0] + r[2]) / 2;
    // (el muro del fondo es el de enfrente de la puerta)
    const wallZ = d[3] <= r[1] + 0.01 ? r[3] : r[1];
    const face = wallZ === r[1] ? 's' : 'n';
    arcosolium(ctx, cx, YC, wallZ, face, { w: 2.4, rise: 0.75, spring: 1.0, effigy: id.endsWith('A') || id.endsWith('D'), open: id.endsWith('B') });
    P.candles(ctx, r[0] + 0.5, YC, (r[1] + r[3]) / 2, 4, Math.round(cx * 13), { room: ROOM, radius: 3.5, intensity: 0.7 });
    P.decal(ctx, r[0] + 0.02, YC + 1.6, (r[1] + r[3]) / 2, 1.4, 'splat', 0, { wall: 'x', opacity: 0.35 });
  }

  // --- las escaleras: la de la sala de llegada (y su puerta, atrancada por
  // este lado) y la que baja a los Inocentes
  stairs(ctx, -12.9, YC, -101.75, 'e', 2.5, 12, 0.3, 0.45, 'flag', { solidBelow: true });
  rampVault(ctx, { axis: 'x', x0: -12.9, x1: -7.5, z0: -103, z1: -100.5, ys0: YC + 2.2, ys1: Y + 2.2, rise: 1.0, mat: 'rock', tint: RK, room: ROOM });
  L.interact.push({ kind: 'door', id: 'd_atajo_llegada', x: -7.25, y: Y, z: -101.75, w: 2.5, h: 2.2, axis: 'z', lock: { type: 'barred', side: -1 }, mat: 'planks', hinge: -1, swing: -1, plane: -7.5, inset: 0.1 });
  stairs(ctx, -65.15, YI, -93.5, 'e', 3, 7, 0.3, 0.45, 'flag', { solidBelow: true });
  rampVault(ctx, { axis: 'x', x0: -65.15, x1: -62, z0: -95, z1: -92, ys0: YI + 2.2, ys1: YC + 2.2, rise: 1.0, mat: 'rock', tint: RK, room: ROOM });

  // --- restos, velas y muertos por las galerías
  for (const [x, z, n, s] of [
    [-34.5, -100.6, 8, 4770],
    [-27.8, -93.5, 6, 4771],
    [-14.2, -97.5, 9, 4772],
    [-48.2, -93.5, 7, 4773],
    [-60.4, -93.4, 6, 4774],
    [-44.5, -86.2, 8, 4775],
    [-35.5, -86.0, 5, 4776],
  ])
    P.bones(ctx, x, YC, z, n, s, 0.6);
  for (const [x, z, n, s] of [
    [-16.6, -100.2, 5, 4780],
    [-52, -98.6, 6, 4781],
    [-34.2, -86.3, 4, 4782],
  ])
    P.candles(ctx, x, YC, z, n, s, { room: ROOM, radius: 4, intensity: 0.7 });
  bakeCorpse(ctx.wb, -22.4, YC, -93.6, 1.4, 'back', 'villager', 4785);
  P.decal(ctx, -22.4, YC + 0.02, -93.6, 1.5);
  bakeCorpse(ctx.wb, -41.6, YC, -86.3, -0.4, 'face', 'villager', 4786);
  ctx.rats.push({ x: -45, y: YC, z: -93.5, n: 3 });
  ctx.rats.push({ x: -14, y: YC, z: -90, n: 2 });
  L.phantoms.push({ x: -58, y: YC, z: -93.5, trigger: [-40, YC, -93.5], kind: 'mourner' });
}

// ------------------------------------------------------------ la catacumba de los Inocentes
// El nivel de abajo: nichos pequeños, de niños. La Pila de los Inocentes,
// bajo su bóveda (con la escalera del atajo, que sube a la cripta de San
// Martín); el cruce, un cubículo y, tras su rastrillo, el Relicario de San
// Martín: la Cámara de la Garra.
function buildInocentes(ctx, L) {
  const wb = ctx.wb;
  // --- la pila de los inocentes: bóveda a lo largo de z (al norte, el arco
  // del atajo), ataúdes pequeños con paños blancos y la pila
  const R = [-76, -108, -66, -96];
  const cx = (R[0] + R[2]) / 2;
  const ys = YI + 2.6;
  barrelVault(ctx, { x0: R[0], x1: R[2], z0: R[1], z1: R[3], axis: 'z', ys, rise: 2.2, mat: 'rock', tint: RK.map((v) => v * 0.92), room: ROOM, sub: 1.0, impostTint: AT });
  lunette(ctx, { axis: 'z', at: R[1], c: cx, span: R[2] - R[0], ys, rise: 2.2, face: 1, mat: 'rock', tint: RK, room: ROOM, hole: { u0: -75.8, u1: -72.2, y: YI + 3.9 } });
  lunette(ctx, { axis: 'z', at: R[3], c: cx, span: R[2] - R[0], ys, rise: 2.2, face: -1, mat: 'rock', tint: RK, room: ROOM });
  crown(ctx, R[0], R[1], R[2], R[3], ys + 2.2);
  arch(ctx, { axis: 'x', c: -74, w: 3, y0: YI + 2.4, rise: 1.2, ring: 0.3, t0: R[1] - 0.15, t1: R[1], top: YI + 3.9, clip: [-75.8, -72.2], spMat: 'rock', spTint: RK });
  for (let k = 0; k < 4; k++) {
    const z = R[1] + 2.2 + k * 2.6;
    if (z > -98) break;
    for (const x of [R[0] + 0.7, R[2] - 0.7]) {
      if (x < cx && z < -104.5) continue; // (el hueco del atajo)
      P.sarcophagus(ctx, x, YI, z, Math.PI / 2, { room: ROOM, l: 0.55, w: 0.3 });
      wb.box('clothWhite', x - 0.32, YI + 1.08, z - 0.5, x + 0.32, YI + 1.09, z + 0.5, { faces: 't', ao: false, room: ROOM, tint: [0.8, 0.76, 0.7] });
    }
  }
  for (const [x, z, s] of [
    [R[0] + 1.3, R[3] - 0.8, 4790],
    [R[2] - 1.4, R[1] + 0.9, 4791],
  ])
    P.candles(ctx, x, YI, z, 6, s, { room: ROOM, radius: 4.5, intensity: 0.9 });
  P.hangingLamp(ctx, cx, ys + 2.2 - 0.1, -100, { room: ROOM, len: 1.2, radius: 6, intensity: 0.7 });
  // la escalera del atajo: el arco de la cripta ya lo pone ella; aquí, la
  // bóveda del rellano
  // --- el cruce, el cubículo y la puerta del relicario
  P.bones(ctx, -78, YI, -89.2, 9, 4792, 0.7);
  P.candles(ctx, -79.2, YI, -98.8, 5, 4793, { room: ROOM, radius: 4, intensity: 0.7 });
  P.wallTorch(ctx, -76, YI + 2.0, -97.5, 'w', { room: ROOM, radius: 6 });
  const CL = DEEP.claw,
    G = CL.gate;
  arch(ctx, { axis: 'z', c: (G.z0 + G.z1) / 2, w: G.z1 - G.z0, y0: YI + 2.2, rise: 0.9, ring: 0.3, t0: CL.x1, t1: -80, top: YI + 3.4, clip: [G.z0 - 0.3, G.z1 + 0.3], spMat: 'rock', spTint: RK });
  // Dom Mendo, el otro canónigo, muerto ante el rastrillo (con su nota)
  bakeCorpse(ctx.wb, -78.6, YI, -96.8, 2.6, 'sit', 'villager', 4795);
  L.interact.push({ kind: 'note', id: 'n_garra', note: 'garra', x: -78.2, y: YI + 0.05, z: -96.0, model: 'paper' });

  // --- el relicario de San Martín: muros y bóveda de huesos, el altar del
  // arca en el centro y los sepulcros abiertos de los lados (sus muertos y
  // los de los muros son el Custodio: entities/custodio.js)
  const cxr = (CL.x0 + CL.x1) / 2,
    czr = (CL.z0 + CL.z1) / 2;
  const RYS = YI + 3.4,
    RR = 4.0;
  barrelVault(ctx, { x0: CL.x0, x1: CL.x1, z0: CL.z0, z1: CL.z1, axis: 'z', ys: RYS, rise: RR, mat: 'skulls', tint: [0.72, 0.69, 0.65], room: ROOM, sub: 1.0, impostTint: AT });
  lunette(ctx, { axis: 'z', at: CL.z0, c: cxr, span: CL.x1 - CL.x0, ys: RYS, rise: RR, face: 1, mat: 'skulls', tint: ST, room: ROOM });
  lunette(ctx, { axis: 'z', at: CL.z1, c: cxr, span: CL.x1 - CL.x0, ys: RYS, rise: RR, face: -1, mat: 'skulls', tint: ST, room: ROOM });
  crown(ctx, CL.x0, CL.z0, CL.x1, CL.z1, RYS + RR);
  for (const z of [CL.z0 + 4.5, czr, CL.z1 - 4.5]) {
    archRing(ctx, { axis: 'x', c: cxr, w: CL.x1 - CL.x0 - 0.5, y0: RYS, rise: RR - 0.25, ring: 0.3, t0: z - 0.22, t1: z + 0.22, mat: 'ashlar', room: ROOM, tint: AT, cam: false });
    pilaster(ctx, CL.x0, z, 'e', YI, RYS, { room: ROOM, tint: AT, w: 0.5, d: 0.18 });
    pilaster(ctx, CL.x1, z, 'w', YI, RYS, { room: ROOM, tint: AT, w: 0.5, d: 0.18 });
  }
  P.boneWall(ctx, cxr, YI, CL.z0 + 0.06, 0, CL.x1 - CL.x0 - 0.4, 3.2, { room: ROOM, seed: 4432 });
  P.boneWall(ctx, cxr, YI, CL.z1 - 0.06, Math.PI, CL.x1 - CL.x0 - 0.4, 3.2, { room: ROOM, seed: 4433 });
  // el altar del relicario, con su paño rojo y el arca (su tapa, que se abre
  // al caer el Custodio, la pone game/crypt.js)
  const ax = cxr,
    az = czr;
  wb.box('ashlar', ax - 0.9, YI, az - 0.55, ax + 0.9, YI + 0.95, az + 0.55, { faces: 'tnsew', sub: 2, room: ROOM, tint: AT });
  wb.box('ashlar', ax - 1.0, YI + 0.95, az - 0.62, ax + 1.0, YI + 1.05, az + 0.62, { ao: false, room: ROOM, tint: AT });
  wb.box('clothRed', ax - 0.75, YI + 1.051, az - 0.4, ax + 0.75, YI + 1.06, az + 0.4, { faces: 't', ao: false, room: ROOM });
  wb.box('bronze', ax - 0.32, YI + 1.06, az + 0.12, ax + 0.32, YI + 1.36, az + 0.36, { ao: false, room: ROOM, faces: 'tnsew' });
  ctx.col.add(ax - 1.0, YI, az - 0.62, ax + 1.0, YI + 1.05, az + 0.62);
  P.candles(ctx, ax - 0.7, YI + 1.05, az - 0.4, 4, 4430, { room: ROOM, radius: 5, intensity: 1.0, spread: 0.15 });
  P.candles(ctx, ax + 0.7, YI + 1.05, az - 0.4, 4, 4431, { room: ROOM, radius: 4, intensity: 0.6, spread: 0.15 });
  // los sepulcros abiertos de los lados y las cadenas de la bóveda
  for (const [x, z] of CLAW_TOMBS) P.sarcophagus(ctx, x, YI, z, 0, { open: true, room: ROOM, l: 0.9, w: 0.45 });
  for (let k = 0; k < 4; k++) for (let c = 0; c < 9; c++) wb.box('iron', ax - 2 + k * 1.3 - 0.03, RYS + RR - 0.4 - c * 0.14, az - 2.5 + k - 0.03, ax - 2 + k * 1.3 + 0.03, RYS + RR - 0.3 - c * 0.14, az - 2.5 + k + 0.03, { ao: false, room: ROOM });
  P.hangingLamp(ctx, ax, RYS + RR - 0.05, az - 3, { room: ROOM, len: 1.8, radius: 8, intensity: 0.9 });
  ctx.lights.push({ x: ax, y: YI + 1.8, z: az, r: 1, g: 0.78, b: 0.4, radius: 4, intensity: 0.6, room: ROOM });
  // (y una luz baja que llena la sala: el montón de huesos, detrás del altar)
  ctx.lights.push({ x: ax - 2, y: YI + 2.6, z: az, r: 1, g: 0.6, b: 0.34, radius: 10, intensity: 0.45, room: ROOM });
  for (const z of [CL.z0 + 2.2, CL.z1 - 2.2]) for (const x of [CL.x0, CL.x1]) P.wallTorch(ctx, x, YI + 2.4, z, x === CL.x0 ? 'e' : 'w', { room: ROOM, radius: 6 });
  // (la Garra, en el arca: aparece al caer el Custodio)
  L.interact.push({ kind: 'item', id: 'i_garra', item: 'garra', x: ax, y: YI + 1.37, z: az + 0.08, afterBoss: 'custodio' });
}
// los sepulcros abiertos del relicario
const CLAW_TOMBS = [
  [-94.9, -100.6],
  [-94.9, -87.4],
  [-82.1, -100.6],
  [-82.1, -86.8],
];

// ------------------------------------------------------------ la cripta de los mártires
// Por una puerta en el muro del sepulcro del arzobispo (su paso privado), un
// martyrium de tres naves con bóvedas de arista y los arcosolios de los
// mártires; al norte, bajando, la Pila de los Mártires bajo su baldaquino de
// columnas; al sur, la sacristía del arzobispo, que se abre con su anillo.
function buildMartires(ctx, L) {
  const wb = ctx.wb;
  const MR = DEEP.martyr,
    FH = DEEP.fontHall,
    SA = DEEP.sacristy;
  // --- el paso del arzobispo (en el eje del sepulcro): su bóveda, los
  // peldaños y el arco
  const PZ = -120,
    pw = 2.5;
  barrelVault(ctx, { x0: 16.5, x1: 20.2, z0: PZ - pw / 2, z1: PZ + pw / 2, axis: 'x', ys: Y + 2.2, rise: 1.0, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
  stairs(ctx, MR.x0, Y1, PZ, 'w', pw, 4, 0.3, 0.45, 'ashlar', { solidBelow: true });
  rampVault(ctx, { axis: 'x', x0: 20.2, x1: MR.x0, z0: PZ - pw / 2, z1: PZ + pw / 2, ys0: Y + 2.2, ys1: Y1 + 2.2, rise: 1.0, mat: 'ashlar', tint: VT, room: ROOM });
  arch(ctx, { axis: 'z', c: PZ, w: pw, y0: Y1 + 2.2, rise: 1.0, ring: 0.3, t0: MR.x0, t1: MR.x0 + 0.15, top: Y1 + 3.5, clip: [PZ - pw / 2 - 0.3, PZ + pw / 2 + 0.3] });
  P.wallTorch(ctx, 18.3, Y + 2.0, PZ - pw / 2, 's', { room: ROOM, radius: 5 });

  // --- el martyrium
  const xs = [MR.x0, 26, 31, MR.x1],
    zs = [];
  for (let z = MR.z0; z <= MR.z1 + 0.01; z += 5) zs.push(z);
  // (los centros de los tramos: el cuarto, el de la puerta)
  const bays = zs.slice(0, -1).map((z) => z + 2.5);
  const MYS = Y1 + 3.4;
  groinVaults(ctx, {
    xs,
    zs,
    ys: MYS,
    rise: 2.2,
    mat: 'mossstone',
    tint: VT,
    room: ROOM,
    walls: { n: true, s: true, e: true, w: true },
    holes: [
      { side: 'w', u0: PZ - pw / 2 - 0.3, u1: PZ + pw / 2 + 0.3, y: Y1 + 3.5 },
      { side: 'n', u0: 26.2, u1: 30.8, y: Y1 + 3.7 },
    ],
    ribs: true,
    ribMat: 'ashlar',
    ribTint: AT,
    ribW: 0.3,
    ribD: 0.18,
  });
  crown(ctx, MR.x0, MR.z0, MR.x1, MR.z1, MYS + 2.2);
  for (const x of [26, 31]) for (const z of zs.slice(1, -1)) P.column(ctx, x, Y1, z, MYS - Y1, 0.32, { mat: 'ashlar' });
  for (const z of zs.slice(1, -1)) {
    pilaster(ctx, MR.x1, z, 'w', Y1, MYS, { room: ROOM, tint: AT, w: 0.5, d: 0.16 });
    pilaster(ctx, MR.x0, z, 'e', Y1, MYS, { room: ROOM, tint: AT, w: 0.5, d: 0.16 });
  }
  // los arcosolios de los mártires, en los muros largos (al este, frente a la
  // puerta, el estandarte; al oeste, la puerta, la lápida y la rueda)
  bays.forEach((z, k) => z !== PZ && arcosolium(ctx, MR.x1, Y1, z, 'w', { w: 2.4, rise: 0.8, effigy: k % 2 === 1, open: k === 2 }));
  for (const z of [bays[0], bays[1], bays[5]]) arcosolium(ctx, MR.x0, Y1, z, 'e', { w: 2.4, rise: 0.8, effigy: true });
  // lo que se usó con ellos: la rueda, los garfios; estandartes y velas
  P.cartWheel && P.cartWheel(ctx, MR.x0 + 0.5, Y1, bays[4] + 0.9, 0.6, { room: ROOM });
  for (const z of [zs[2], zs[4]]) for (const dx of [-0.3, 0.3]) P.chains(ctx, 28.5 + dx, MYS + 2.0, z, 14, 0);
  P.banner(ctx, MR.x1 - 0.08, MYS - 0.2, PZ, -Math.PI / 2, 'bannerRed', 1.2, 2.6);
  // (y bajo él, frente a la puerta, el altar de los mártires)
  P.candleAltar(ctx, MR.x1 - 0.55, Y1, PZ, -Math.PI / 2, ROOM);
  P.candelabra(ctx, 28.5, Y1, MR.z0 + 2.4, { room: ROOM });
  P.candelabra(ctx, 28.5, Y1, MR.z1 - 2.4, { room: ROOM });
  // (velas ante los arcosolios: alumbran las naves laterales)
  for (const [x, k, s] of [
    [MR.x1 - 1.3, 0, 4800],
    [MR.x1 - 1.3, 2, 4801],
    [MR.x1 - 1.3, 4, 4802],
    [MR.x0 + 1.3, 1, 4805],
    [MR.x0 + 1.3, 5, 4806],
  ])
    P.candles(ctx, x, Y1, bays[k] + 0.9, 5, s, { room: ROOM, radius: 5.5, intensity: 0.9 });
  for (const z of [zs[1], zs[3], zs[5]]) P.hangingLamp(ctx, 28.5, MYS + 2.2 - 0.1, z, { room: ROOM, len: 1.2, radius: 8, intensity: 0.9 });
  P.bones(ctx, 24, Y1, -132.1, 8, 4803, 0.7);
  bakeCorpse(ctx.wb, 32.8, Y1, -121.3, -2.0, 'curl', 'villager', 4804);
  P.decal(ctx, 32.8, Y1 + 0.02, -121.3, 1.6);
  ctx.rats.push({ x: 33.5, y: Y1, z: -109, n: 2 });
  plaque(ctx, MR.x0 + 0.06, Y1 + 1.6, bays[2] - 1.1, 'e', 1.0, 0.6);
  L.interact.push({ kind: 'note', id: 'n_martires', note: 'martires', x: MR.x0 + 0.4, y: Y1 + 1.4, z: bays[2] - 1.1, model: 'wall', r: 1.8 });

  // --- la bajada a la pila: peldaños, bóveda en rampa y los arcos de sus dos
  // bocas
  stairs(ctx, 28.5, YC, FH.z1, 's', 4, 8, (Y1 - YC) / 8, (MR.z0 - FH.z1) / 8, 'ashlar', { solidBelow: true });
  rampVault(ctx, { x0: 26.5, x1: 30.5, z0: FH.z1, z1: MR.z0, ys0: YC + 2.2, ys1: Y1 + 2.2, rise: 1.2, mat: 'ashlar', tint: VT, room: ROOM });
  arch(ctx, { axis: 'x', c: 28.5, w: 4, y0: Y1 + 2.2, rise: 1.2, ring: 0.3, t0: MR.z0, t1: MR.z0 + 0.15, top: Y1 + 3.7, clip: [26.2, 30.8] });
  arch(ctx, { axis: 'x', c: 28.5, w: 4, y0: YC + 2.2, rise: 1.2, ring: 0.3, t0: FH.z1 - 0.15, t1: FH.z1, top: YC + 3.7, clip: [26.2, 30.8] });

  // --- la pila de los mártires: tres naves de arista con la pila bajo el
  // tramo central, entre cuatro columnas
  const fys = YC + 3.0,
    frise = 2.4;
  const F2 = DEEP.font2;
  const fxs = [FH.x0, 26, 31, FH.x1],
    fzs = [FH.z0, F2.z0, F2.z1, FH.z1],
    fcz = (F2.z0 + F2.z1) / 2;
  groinVaults(ctx, { xs: fxs, zs: fzs, ys: fys, rise: frise, mat: 'mossstone', tint: VT, room: ROOM, walls: { n: true, s: true, e: true, w: true }, holes: [{ side: 's', u0: 26.2, u1: 30.8, y: YC + 3.7 }], ribs: true, ribMat: 'ashlar', ribTint: AT, ribW: 0.32, ribD: 0.2 });
  crown(ctx, FH.x0, FH.z0, FH.x1, FH.z1, fys + frise);
  for (const x of [26, 31]) for (const z of [F2.z0, F2.z1]) P.column(ctx, x, YC, z, fys - YC, 0.38, { mat: 'ashlar' });
  for (const z of [F2.z0, F2.z1]) {
    pilaster(ctx, FH.x0, z, 'e', YC, fys, { room: ROOM, tint: AT, w: 0.5, d: 0.16 });
    pilaster(ctx, FH.x1, z, 'w', YC, fys, { room: ROOM, tint: AT, w: 0.5, d: 0.16 });
  }
  for (const x of [26, 31]) {
    pilaster(ctx, FH.z0, x, 's', YC, fys, { room: ROOM, tint: AT, w: 0.5, d: 0.16 });
  }
  for (const x of [24, 33]) arcosolium(ctx, x, YC, FH.z0, 's', { w: 2.4, rise: 0.8, effigy: x > 30 });
  P.banner(ctx, FH.x0 + 0.08, fys - 0.3, fcz, Math.PI / 2, 'bannerBlack', 1.2, 2.6);
  P.hangingLamp(ctx, 28.5, fys + frise - 0.1, fcz + 3.5, { room: ROOM, len: 1.6, radius: 7, intensity: 0.8 });
  for (const [x, z, s] of [
    [23.2, FH.z0 + 1.2, 4810],
    [33.8, FH.z1 - 1.4, 4811],
  ])
    P.candles(ctx, x, YC, z, 6, s, { room: ROOM, radius: 4.5, intensity: 0.9 });
  P.bones(ctx, 33, YC, FH.z0 + 2.2, 10, 4812, 0.9);
  P.bones(ctx, 23.6, YC, FH.z1 - 3, 7, 4813, 0.7);
  P.fleshGrowth(ctx, FH.x1 - 0.6, YC, FH.z0 + 0.6, 1.0, 4443, { room: ROOM, climb: 2.4 });

  // --- la sacristía del arzobispo: armarios de los ornamentos, la mesa del
  // incienso, los incensarios colgados y el arcón; techo de vigas
  const r = SA;
  const cx = (r.x0 + r.x1) / 2,
    cz = (r.z0 + r.z1) / 2;
  for (let x = r.x0 + 1.2; x < r.x1 - 0.5; x += 1.8) wb.box('timber', x - 0.12, Y1 + 2.75, r.z0, x + 0.12, Y1 + 3.0, r.z1, { ao: false, room: ROOM, faces: 'nsewb' });
  P.shelf && P.shelf(ctx, r.x0 + 1.3, Y1, r.z1 - 0.25, Math.PI, 2.0);
  P.shelf && P.shelf(ctx, r.x1 - 0.25, Y1, cz, -Math.PI / 2, 2.4);
  P.table(ctx, cx - 0.6, Y1, cz - 0.4, 2.0, 0.9, 0);
  P.bench(ctx, cx - 0.6, Y1, cz + 0.5, 1.6, 0);
  wb.box('wooddark', r.x0 + 0.3, Y1, r.z0 + 0.8, r.x0 + 1.6, Y1 + 0.7, r.z0 + 1.5, { faces: 'tnsew', aoH: 0.5, room: ROOM });
  ctx.col.add(r.x0 + 0.3, Y1, r.z0 + 0.8, r.x0 + 1.6, Y1 + 0.72, r.z0 + 1.5);
  for (const x of [r.x0 + 4.6, r.x0 + 6.2, r.x0 + 7.8]) {
    for (let c = 0; c < 6; c++) wb.box('iron', x - 0.02, Y1 + 2.7 - c * 0.12, r.z1 - 0.5 - 0.02, x + 0.02, Y1 + 2.8 - c * 0.12, r.z1 - 0.5 + 0.02, { ao: false, room: ROOM });
    wb.cylinder('bronze', x, Y1 + 1.7, r.z1 - 0.5, 0.12, 0.16, 0.26, 7, { ao: false, capBot: true, room: ROOM });
  }
  P.candles(ctx, cx - 1.2, Y1 + 0.8, cz - 0.6, 3, 4510, { room: ROOM, radius: 4, intensity: 0.8, spread: 0.2 });
  P.candles(ctx, r.x1 - 0.7, Y1, r.z0 + 0.8, 5, 4511, { room: ROOM, radius: 4, intensity: 0.7 });
  bakeCorpse(ctx.wb, cx + 1.6, Y1, cz + 2.2, 2.4, 'face', 'villager', 4512);
  P.decal(ctx, cx + 1.6, Y1 + 0.02, cz + 2.2, 1.7);
  L.interact.push(
    { kind: 'door', id: 'd_sacristia', x: r.door.x, y: Y1, z: r.door.z, w: r.door.w, h: 2.4, axis: 'x', lock: { type: 'key', item: 'anillo' }, mat: 'planks', hinge: -1, swing: 1, plane: r.z0 },
    { kind: 'item', id: 'i_incienso', item: 'incienso', x: cx - 0.6, y: Y1 + 0.86, z: cz - 0.4 },
    { kind: 'note', id: 'n_incienso', note: 'incienso', x: cx + 0.1, y: Y1 + 0.81, z: cz - 0.6, model: 'book' }
  );
}

// ------------------------------------------------------------ las pilas y sus cadenas
// (la taza en el centro de su rectángulo; la cadena de la compuerta, en el
// muro: la palanca del juego)
function buildFonts(ctx, L) {
  const D = DEEP;
  const FONTS = [
    { id: 'oeste', r: D.font1, y: YI, lever: { x: -75.1, z: -103.5, d: 'e' } },
    { id: 'este', r: D.font2, y: YC, lever: { x: D.fontHall.x1 - 0.9, z: (D.font2.z0 + D.font2.z1) / 2, d: 'w' } },
    // (la de los Condenados la guarda Dom Paio: hasta que cae, no se echa)
    { id: 'honda', r: D.font3, y: PY, lever: { x: (D.font3.x0 + D.font3.x1) / 2, z: D.pozo.z0 + 0.9, d: 's' }, guard: 'paioHollow' },
  ];
  for (const F of FONTS) {
    const { r, y } = F;
    bloodFont(ctx, (r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2, ROOM);
    const lv = F.lever;
    const n = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[lv.d];
    chainMount(ctx, lv.x, y, lv.z, lv.d, ROOM);
    L.interact.push({ kind: 'lever', id: 'p_pila_' + F.id, font: F.id, x: lv.x, y, z: lv.z, nx: n[0], nz: n[1], r: 1.8, guard: F.guard });
  }
}

// ------------------------------------------------------------ criaturas
function buildCreatures(L) {
  const D = DEEP;
  const e = (type, x, y, z, id, o = {}) => ({ type, x, y, z, yaw: o.yaw ?? 0, idle: o.idle ?? 'stand', id, ...o });
  const CL = D.claw;
  const cxr = (CL.x0 + CL.x1) / 2,
    czr = (CL.z0 + CL.z1) / 2;
  L.enemies.push(
    // la sala de los obispos
    e('penitent', -44.5, Y1, -123.6, 'e_ob1', { idle: 'pray', yaw: Math.PI }),
    e('penitent', -56.8, Y1, -113.6, 'e_ob2', { idle: 'kneel', yaw: Math.PI / 2 }),
    e('soldier', -34.5, Y1, -128.5, 'e_ob3', { idle: 'wander', yaw: -Math.PI / 2 }),
    e('crawler', -49.5, Y1, -116, 'e_ob4', { idle: 'ceiling' }),
    e('mourner', -29.5, Y1, -110.5, 'e_ob5', { idle: 'wander' }),
    // la cripta de San Martín (en calma) y su osario
    e('soldier', -81, Y1, -125, 'e_sm1', { yaw: Math.PI }),
    e('mourner', -90.5, Y1, -146, 'e_sm2', { idle: 'pray', yaw: -Math.PI / 2 }),
    // las catacumbas de la Sé
    e('hound', -22.5, YC, -93.5, 'e_c1a', { idle: 'eat', yaw: 1.2 }),
    e('hound', -45.2, YC, -93.4, 'e_c1b', { idle: 'eat', yaw: -0.6 }),
    e('crawler', -58, YC, -93.5, 'e_c1c', { idle: 'ceiling' }),
    e('bell', -52, YC, -90.5, 'e_c1d', { idle: 'stand', yaw: 0 }),
    e('penitent', -43.5, YC, -86.3, 'e_c1e', { idle: 'pray', yaw: Math.PI / 2 }),
    e('crawler', -14.2, YC, -95.5, 'e_c1f', { idle: 'ceiling' }),
    e('soldier', -45.2, YC, -98, 'e_c1g', { idle: 'stand', yaw: Math.PI }),
    // los Inocentes
    e('mourner', -71, YI, -99.2, 'e_c2a', { idle: 'pray', yaw: Math.PI }),
    e('crawler', -70.5, YI, -93.5, 'e_c2b', { idle: 'ceiling' }),
    e('mourner', -78, YI, -103.5, 'e_c2c', { idle: 'wander' }),
    // el Custodio de la Garra: hundido en su montón, detrás del altar del
    // arca (se levanta al entrar en el relicario: game/crypt.js)
    { type: 'custodio', x: cxr - 4, y: YI, z: czr, yaw: Math.PI / 2, idle: 'boss', boss: true, id: 'b_custodio' },
    // la cripta de los mártires, su pila y la sacristía
    e('penitent', 28.5, Y1, -130.1, 'e_est1', { idle: 'pray', yaw: Math.PI }),
    e('penitent', 33.2, Y1, -115.3, 'e_est2', { idle: 'eat', yaw: -1.2 }),
    e('soldier', 24, Y1, -123.4, 'e_est3', { yaw: Math.PI / 2 }),
    e('bell', 28.5, YC, -161.5, 'e_est4', { idle: 'wander', yaw: 0 }),
    e('crawler', 23.6, YC, -153, 'e_est5', { idle: 'ceiling' }),
    e('mourner', 25, Y1, -99.5, 'e_sac1', { idle: 'pray', yaw: Math.PI }),
    // Dom Paio: vivo, en la capilla de San Martín (le mueve game/paio.js);
    // convertido, en el pozo, de rodillas ante la cadena de los Condenados
    e('paio', D.paio.x, D.chapel.y, D.paio.z, 'n_dom_paio', { idle: 'pray', yaw: Math.PI }),
    { type: 'paioHollow', x: (D.font3.x0 + D.font3.x1) / 2, y: PY, z: D.pozo.z0 + 2.6, yaw: Math.PI, idle: 'boss', boss: true, id: 'b_paio' },
    // los Velados
    { type: 'guardianL', x: D.guards[0].x, y: AY, z: D.guards[0].z, yaw: -Math.PI / 2, idle: 'boss', boss: true, id: 'b_veladoL' },
    { type: 'guardianR', x: D.guards[1].x, y: AY, z: D.guards[1].z, yaw: -Math.PI / 2, idle: 'boss', boss: true, id: 'b_veladoR' }
  );
}
