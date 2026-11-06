// Lo de cada día (PLAN_FORTALEZA.md, fase 9, segunda pasada): las salas que
// tools/densidad.mjs daba por más pobres (de 10 a 20 triángulos por m²: el
// oratorio del Rey, la cámara de la reina, el estrado de las damas, el
// oratorio de la reina, la antecámara, las cámaras de la torre del
// homenaje, el sótano del Alemán, la capilla de San Fructuoso) se amueblan
// con lo que hay en cualquier casa: alfombras, escaños, sillas de tijera,
// alacenas, aparadores, tinajas, cántaros, repisas, atriles, una escoba y un
// cubo en un rincón. No cuentan nada nuevo: que se vea que allí se vivía.
//
// Todo, lejos de las puertas y de los pasos entre ellas (tools/circula.mjs lo
// comprueba sala por sala) y con colisión sólo donde estorba.
import * as THREE from 'three';
import * as P from './props.js';
import { chest } from './level_souto.js';
import { FORT } from './fortaleza_medidas.js';
import { ALEMAN } from './level_postigo.js';
import * as M from './mobiliario.js';

// (con su sala puesta: lo de props.js toma la del momento)
function en(ctx, room, fn) {
  ctx.wb.setRoom(room);
  fn();
  ctx.wb.setRoom(null);
}

export function amueblar(ctx, L) {
  estradoDamas(ctx);
  oratorioReina(ctx);
  camaraReina(ctx);
  guardarropaRey(ctx);
  antecamara(ctx);
  camaraRey(ctx);
  guardiaTorre(ctx);
  consejoTorre(ctx);
  camaraTorre(ctx);
  sotanoAleman(ctx);
  capillaFructuoso(ctx);
  void L;
}

// ------------------------------------------------------------------ el estrado de las damas
// El estrado se cubría de alfombras y almohadones: ahí se sentaban ellas, en
// el suelo, a la morisca, a coser y a hilar. Al lado, el bastidor junto a la
// luz, los escabeles, el aparador con la vajilla de la reina, el cesto de la
// lana, la lámpara del techo.
function estradoDamas(ctx) {
  const R = FORT.reina;
  const room = 'estrado_damas';
  const { x0, x1, z0, z1 } = R;
  en(ctx, room, () => {
    // la alfombra del estrado y los almohadones (entre los que había)
    M.alfombra(ctx, (x0 + x1) / 2, 0.3, z0 + 1.25, 0, x1 - x0 - 4.4, 2.1, { room, campo: 'clothRed', cenefa: 'clothBlue' });
    const xs = [];
    for (let x = x0 + 2.8; x < x1 - 2.4; x += 1.5) xs.push(x);
    for (let k = 0; k < xs.length - 1; k++) if (k % 2 === 0) M.almohadones(ctx, xs[k] + 0.75, 0.33, z0 + 1.7, 0.2 * (k - 2), 2 + (k % 3 === 0 ? 1 : 0), { room, seed: 6801 + k });
    // el cesto de la lana y el huso, en el estrado
    P.basket(ctx, x0 + 3.5, 0.33, z0 + 0.3, { room });
    P.basket(ctx, x1 - 2.3, 0.33, z0 + 0.5, { room, tipped: true, rot: -0.6, fill: 'clothWhite', fillTint: [0.86, 0.82, 0.74] });
    // los escabeles, al pie del estrado
    for (const [x, r] of [
      [x0 + 5.6, 0.1],
      [x1 - 5.0, -0.2],
    ])
      M.escabel(ctx, x, 0, z0 + 2.75, r, { room, cojin: 'clothBlue' });
    // el bastidor, junto a la puerta del patio, con su silla
    M.bastidor(ctx, x1 - 2.2, 0, z0 + 4.4, -0.5, { room });
    M.sillaTijera(ctx, x1 - 2.75, 0, z0 + 5.15, 2.6, { room, col: false });
    // el aparador, contra el muro de la torre del homenaje
    M.aparador(ctx, x1 - 0.27, 0, (z0 + z1) / 2 + 1.4, -Math.PI / 2, 1.6, { room });
    // una alfombra de esparto en el paso de la puerta de la torre
    M.estera(ctx, x0 + 1.5, 0, -94.0, Math.PI / 2, 1.2, 2.4, { room });
  });
  P.hangingLamp(ctx, -121.0, FORT.F1 - 0.72, (z0 + z1) / 2 + 0.6, { room, len: 1.2, radius: 7, intensity: 0.7 });
}

// ------------------------------------------------------------------ el oratorio de la reina
// Los escaños de las damas bajo la ventana del campo, la alfombra ante el
// altar, el atril con el misal y los dos hacheros.
function oratorioReina(ctx) {
  const T = FORT.torres.NO;
  const ix0 = T.x0 + T.t,
    iz0 = T.z0 + T.t;
  const y = FORT.reina.pisos[1];
  const room = 'reina_oratorio';
  const ax = ix0 + 2.2,
    az = iz0 + 0.55;
  en(ctx, room, () => {
    M.alfombra(ctx, ax, y, az + 1.75, 0, 2.6, 2.0, { room, campo: 'clothBlue', cenefa: 'clothRed' });
    M.escano(ctx, ix0 + 0.28, y, iz0 + 4.9, Math.PI / 2, 1.8, { room, cojin: 'clothRed' });
    M.atril(ctx, ax + 1.55, y, az + 0.3, 0.25, { room });
    P.candelabra(ctx, ax - 1.2, y, az + 0.35, { room });
    M.escabel(ctx, ax - 0.9, y, az + 2.8, 0.15, { room, cojin: 'clothRed' });
  });
}

// ------------------------------------------------------------------ la cámara de la reina
// El tocador contra el muro del sur (el espejo de plata en su pie, el peine,
// los botes de los afeites, el cofrecillo de las joyas), su silla; la
// alfombra junto a la cama; el aguamanil; la percha con sus tocas y su
// manto; los almohadones junto a la ventana.
function camaraReina(ctx) {
  const T = FORT.torres.NO;
  const ix0 = T.x0 + T.t,
    ix1 = T.x1 - T.t,
    iz0 = T.z0 + T.t,
    iz1 = T.z1 - T.t;
  const cx = (ix0 + ix1) / 2,
    cz = (iz0 + iz1) / 2;
  const y = FORT.reina.pisos[2];
  const room = 'reina_camara';
  const wb = ctx.wb;
  en(ctx, room, () => {
    M.alfombra(ctx, ix0 + 3.2, y, cz - 1.0, Math.PI / 2, 2.8, 1.6, { room, campo: 'clothRed', cenefa: 'clothDark' });
    // el tocador
    const tx = ix0 + 3.6,
      tz = iz1 - 0.42;
    P.table(ctx, tx, y, tz, 1.2, 0.56, Math.PI, {});
    wb.at(tx, y + 0.8, tz, Math.PI, () => {
      // el espejo: el disco de plata en su pie de madera
      wb.box('wooddark', -0.06, 0, 0.12, 0.06, 0.03, 0.2, { ao: false, room, faces: 'tnsew' });
      wb.box('wooddark', -0.012, 0.03, 0.15, 0.012, 0.18, 0.17, { ao: false, room, faces: 'nsew' });
      wb.push();
      wb.translate(0, 0.32, 0.16);
      wb.rotateX(Math.PI / 2 - 0.1);
      wb.cylinder('silver', 0, -0.006, 0, 0.14, 0.14, 0.012, 14, { ao: false, room, capTop: true, capBot: true });
      wb.pop();
      wb.ring('gold', 0, 0.32, 0.16, 0.15, 0.14, 0.014, 14, { room });
      // el peine, los botes, el cofrecillo
      wb.box('bone', 0.2, 0, -0.06, 0.32, 0.008, -0.02, { ao: false, room, faces: 'tnsew', tint: [0.94, 0.9, 0.8] });
      for (const [bx, bz, r, h] of [
        [-0.3, 0.05, 0.03, 0.07],
        [-0.38, -0.06, 0.025, 0.09],
        [-0.24, -0.1, 0.022, 0.05],
      ])
        wb.cylinder('glass', bx, 0, bz, r, r * 0.8, h, 8, { ao: false, room, capTop: true, tint: [0.7, 0.8, 0.76] });
      wb.box('wooddark', 0.3, 0, 0.04, 0.48, 0.09, 0.16, { ao: false, room, faces: 'tnsew', tint: [0.86, 0.6, 0.4] });
      wb.box('gold', 0.29, 0.09, 0.03, 0.49, 0.105, 0.17, { ao: false, room, faces: 'tnsewb' });
    });
    M.sillaTijera(ctx, tx, y, tz - 0.75, 0, { room });
    M.aguamanil(ctx, tx + 1.5, y, iz1 - 0.45, 0, { room });
    M.percha(ctx, ix1 - 0.04, y, cz - 2.3, -Math.PI / 2, 1.4, { room, cosas: ['capa', 'nada', 'capa'] });
    M.almohadones(ctx, cx + 0.8, y, iz0 + 0.6, 0.1, 2, { room, seed: 6831 });
  });
}

// ------------------------------------------------------------------ el guardarropa y el oratorio del Rey
// En el guardarropa, el armario de su ropa (abierto: lo registraron), el
// aguamanil, su silla de tijera, la mesa de la ropa doblada y la alfombra;
// en el oratorio, la alfombra ante el altar y el hachero.
function guardarropaRey(ctx) {
  const T = FORT.torres.NE;
  const ix0 = T.x0 + T.t,
    ix1 = T.x1 - T.t,
    iz0 = T.z0 + T.t,
    iz1 = T.z1 - T.t;
  const y = FORT.rey.pisos[1];
  const room = 'oratorio_rey';
  const wb = ctx.wb;
  en(ctx, room, () => {
    M.alacena(ctx, ix1 - 0.27, y, iz0 + 3.6, -Math.PI / 2, 1.2, 1.9, { room, abierta: true, seed: 6551 });
    M.aguamanil(ctx, ix1 - 0.6, y, iz0 + 5.0, 0, { room });
    M.sillaTijera(ctx, ix0 + 3.9, y, iz0 + 2.4, 0.4, { room });
    M.alfombra(ctx, ix0 + 3.0, y, iz0 + 2.8, Math.PI / 2, 3.0, 2.0, { room, campo: 'clothBlue', cenefa: 'clothRed' });
    // la mesa de la ropa doblada, bajo la saetera
    const tx = (ix0 + ix1) / 2 + 2.0,
      tz = iz0 + 0.42;
    P.table(ctx, tx, y, tz, 1.3, 0.6, 0, {});
    const rng = [
      [0.86, 0.82, 0.72],
      [0.42, 0.24, 0.44],
      [0.36, 0.4, 0.56],
    ];
    for (let k = 0; k < 3; k++) wb.box('linen', tx - 0.5 + k * 0.03, y + 0.8 + k * 0.05, tz - 0.2, tx - 0.05 + k * 0.03, y + 0.8 + k * 0.05 + 0.048, tz + 0.18, { ao: false, room, faces: 'tnsew', tint: rng[k] });
    wb.box('leather', tx + 0.15, y + 0.8, tz - 0.1, tx + 0.5, y + 0.83, tz + 0.15, { ao: false, room, faces: 'tnsew', tint: [0.5, 0.34, 0.22] });
    // el oratorio: la alfombra ante el altar (bajo el reclinatorio) y el
    // hachero del lado del evangelio
    const ax = ix0 + 0.55,
      az = iz1 - 2.6;
    M.alfombra(ctx, ax + 1.75, y, az, Math.PI / 2, 2.0, 2.4, { room, campo: 'clothRed', cenefa: 'clothBlue' });
    P.candelabra(ctx, ax + 0.35, y, az - 1.25, { room });
  });
  M.pano(ctx, ix0 + 0.06, y + 3.3, iz0 + 1.5, Math.PI / 2, 1.4, 2.0, { room, mat: 'clothPurple', figura: 'cruz' });
}

// ------------------------------------------------------------------ la antecámara
// Donde esperaban los que pedían audiencia: las sillas de tijera junto a la
// mesa, la alfombra bajo ella, la cantarera del agua en el rincón.
function antecamara(ctx) {
  const K = FORT.rey;
  const { x0, x1, z0, z1 } = K;
  const room = 'antecamara';
  const mx = (x0 + x1) / 2 + 0.6,
    mz = (z0 + z1) / 2 + 1.0;
  en(ctx, room, () => {
    M.alfombra(ctx, mx, 0, mz, Math.PI / 2, 2.8, 2.0, { room, campo: 'clothBlue', cenefa: 'clothRed' });
    M.sillaTijera(ctx, mx - 0.9, 0, mz - 0.35, Math.PI / 2 + 0.2, { room });
    M.sillaTijera(ctx, mx + 0.95, 0, mz + 0.4, -Math.PI / 2 - 0.15, { room });
    M.cantarera(ctx, x1 - 1.05, 0, z0 + 0.3, 0, 2, { room });
  });
}

// ------------------------------------------------------------------ la cámara del Rey
// La alfombra a los pies de la cama, la silla de tijera en la mesa de sus
// cartas, la repisa con el candil y el libro, el escabel.
function camaraRey(ctx) {
  const K = FORT.rey;
  const { x0, x1, z0, z1 } = K;
  const y = K.alto;
  const room = 'camara_rey';
  const bx = x1 - 1.1,
    bz = (z0 + z1) / 2 + 0.6;
  en(ctx, room, () => {
    M.alfombra(ctx, bx - 0.4, y, bz - 1.55, 0, 2.6, 1.2, { room, campo: 'clothRed', cenefa: 'clothBlue' });
    M.escabel(ctx, bx - 0.2, y, bz - 1.05, 0, { room, cojin: 'clothRed' });
    M.repisa(ctx, -78.6, y, z0 + 0.02, 's', 1.0, { room, alto: 1.55, cosas: ['candil', 'libro', 'jarra'] });
  });
}

// ------------------------------------------------------------------ la guardia de la torre
// La alacena de la guardia (el pan, el queso, las escudillas: abierta, con lo
// que dejaron), entre el tonel del agua y el clavijero de los yelmos.
function guardiaTorre(ctx) {
  const K = FORT.torre;
  const ix1 = K.x1 - K.t;
  const y = K.pisos[1];
  const room = 'homenaje_guardia';
  en(ctx, room, () => {
    M.alacena(ctx, ix1 - 0.27, y, -97.4, -Math.PI / 2, 1.2, 1.9, { room, abierta: true, seed: 7761 });
  });
}

// ------------------------------------------------------------------ el consejo de la torre
// Bajo la mesa del Cerco, la alfombra grande; contra el muro del sur, entre
// las ventanas, el escaño de los que esperaban turno; el aparador del vino; el
// atril de los fueros junto a los estantes.
function consejoTorre(ctx) {
  const K = FORT.torre;
  const ix0 = K.x0 + K.t,
    ix1 = K.x1 - K.t,
    iz1 = K.z1 - K.t;
  const y = K.pisos[2];
  const room = 'homenaje_consejo';
  en(ctx, room, () => {
    M.alfombra(ctx, -98.6, y, -95.4, 0, 6.2, 3.4, { room, campo: 'clothRed', cenefa: 'clothBlue' });
    M.escano(ctx, -98.0, y, iz1 - 0.28, Math.PI, 2.6, { room, cojin: 'clothBlue' });
    M.aparador(ctx, ix1 - 0.27, y, -90.4, -Math.PI / 2, 1.6, { room, seed: 7741 });
    M.atril(ctx, ix0 + 1.4, y, -93.4, Math.PI / 2 + 0.3, { room });
    M.cantarera(ctx, ix0 + 3.4, y, iz1 - 0.3, Math.PI, 2, { room, falta: 1 });
  });
}

// ------------------------------------------------------------------ la cámara de la torre
// Las cámaras privadas del Rey en su torre: la alfombra ante el hogar, el
// aguamanil, la percha de su ropa, la alacena, el escabel.
function camaraTorre(ctx) {
  const K = FORT.torre;
  const ix1 = K.x1 - K.t,
    iz0 = K.z0 + K.t;
  const Mz = K.muro;
  const y = K.pisos[2];
  const room = 'homenaje_camara';
  en(ctx, room, () => {
    M.alfombra(ctx, Mz.pilares[0], y, Mz.z0 - 2.0, 0, 3.0, 1.8, { room, campo: 'clothRed', cenefa: 'clothDark' });
    M.aguamanil(ctx, ix1 - 0.5, y, Mz.z0 - 1.1, 0, { room });
    M.alacena(ctx, -96.0, y, iz0 + 0.27, 0, 1.2, 1.9, { room, seed: 7751 });
    M.percha(ctx, -90.6, y, iz0 + 0.04, 0, 1.6, { room, cosas: ['capa', 'gambeson', 'cinto', 'capa'] });
  });
}

// ------------------------------------------------------------------ el sótano del Alemán
// La bodega de una casa de espaderos: los toneles en su poyo contra el muro
// del sur, las tinajas del aceite y del vino, la leña, los jamones y las
// ristras colgadas de las vigas, las cajas de la herrería y las barras de
// acero sin forjar, la piedra de afilar del abuelo.
function sotanoAleman(ctx) {
  const C = ALEMAN.cellar;
  const Y = C.y;
  const room = 'alemanSotano';
  const wb = ctx.wb;
  en(ctx, room, () => {
    P.cask(ctx, 54.2, Y, C.z1 - 0.62, 0, { room, r: 0.45, len: 1.1 });
    P.cask(ctx, 55.6, Y, C.z1 - 0.62, 0, { room, r: 0.45, len: 1.1 });
    M.tinaja(ctx, C.x1 - 0.55, Y, C.z0 + 0.6, 1.0, { room });
    M.tinaja(ctx, C.x1 - 1.35, Y, C.z0 + 0.5, 0.85, { room, tapa: false });
    M.tinaja(ctx, C.x1 - 0.5, Y, C.z0 + 1.45, 0.8, { room });
    P.crate(ctx, 56.4, Y, C.z0 + 0.6, 0.7, 0.2);
    P.crate(ctx, 56.4, Y + 0.7, C.z0 + 0.6, 0.6, 0.5, { collide: false });
    P.firewood(ctx, C.x0 + 0.6, Y, -105.4, Math.PI / 2, 4);
    P.shelf(ctx, C.x0 + 0.22, Y, -102.2, Math.PI / 2, 1.8);
    // las barras de acero, apoyadas en el muro, y la piedra de afilar
    for (let k = 0; k < 6; k++) {
      wb.push();
      wb.translate(C.x0 + 0.12 + k * 0.035, Y, -99.4 + k * 0.05);
      wb.rotateZ(-0.12 - k * 0.01);
      wb.box('iron', -0.012, 0, -0.025, 0.012, 1.15, 0.025, { ao: false, room, faces: 'tnsew', tint: [0.6, 0.6, 0.64] });
      wb.pop();
    }
    {
      const gx = 43.4,
        gz = -100.6;
      for (const s of [-1, 1]) wb.box('wooddark', gx + s * 0.32 - 0.04, Y, gz - 0.35, gx + s * 0.32 + 0.04, Y + 0.62, gz + 0.35, { ao: false, room, faces: 'tnsew' });
      wb.push();
      wb.translate(gx, Y + 0.68, gz);
      wb.rotateZ(Math.PI / 2);
      wb.cylinder('ashlar', 0, -0.07, 0, 0.36, 0.36, 0.14, 14, { ao: false, room, capTop: true, capBot: true, tint: [0.7, 0.68, 0.62] });
      wb.cylinder('iron', 0, -0.4, 0, 0.02, 0.02, 0.8, 6, { ao: false, room });
      wb.pop();
      wb.box('iron', gx + 0.38, Y + 0.68, gz - 0.02, gx + 0.42, Y + 0.68 + 0.18, gz + 0.02, { ao: false, room });
      P.colOBB(ctx, gx, gz, 0.42, 0.38, 0, Y, Y + 1.0);
    }
    // lo colgado de las vigas: jamones, chorizos, ristras de ajos y cebollas
    const viga = C.top - 0.24;
    for (const [x, z0, z1] of [
      [51.6, -100.4, -98.4],
      [54.6, -108.6, -105.6],
    ]) {
      const n = Math.round((z1 - z0) / 0.45);
      for (let k = 0; k <= n; k++) {
        const z = z0 + ((z1 - z0) * k) / n;
        const q = (k + Math.round(x)) % 4;
        const len = q === 0 ? 0.55 : 0.35;
        wb.box('rope', x - 0.008, viga - 0.18, z - 0.008, x + 0.008, viga, z + 0.008, { ao: false, room, faces: 'nsew' });
        if (q === 0) P.ellipsoid(ctx, 'hide', x, viga - 0.18 - len / 2, z, 0.12, len / 2, 0.1, [0.62, 0.36, 0.26], { room });
        else if (q === 1)
          for (let i = 0; i < 4; i++) P.ellipsoid(ctx, 'hide', x + (i % 2 ? 0.04 : -0.04), viga - 0.22 - i * 0.09, z, 0.035, 0.06, 0.035, [0.58, 0.24, 0.18], { room });
        else
          for (let i = 0; i < 6; i++) P.ellipsoid(ctx, 'bone', x + (i % 2 ? 0.035 : -0.035), viga - 0.22 - i * 0.055, z + (i % 3) * 0.02, 0.04, 0.035, 0.04, q === 2 ? [0.9, 0.86, 0.76] : [0.72, 0.5, 0.32], { room });
      }
    }
    M.escoba(ctx, C.x1 - 0.1, Y, -104.2, 'w', { room });
    M.cubo(ctx, C.x1 - 0.5, Y, -103.7, { room });
  });
}

// ------------------------------------------------------------------ la capilla de San Fructuoso
// La pila del agua bendita junto a la puerta, el cepillo de las limosnas, la
// lámpara de la nave, la alfombra ante el altar, los exvotos de cera colgados
// junto a las imágenes, los reclinatorios y los hacheros.
function capillaFructuoso(ctx) {
  const room = 'chapel';
  const wb = ctx.wb;
  en(ctx, room, () => {
    // la pila: la taza de piedra sobre su columna, con el agua
    const px = 47.2,
      pz = 13.2;
    wb.cylinder('ashlar', px, 0, pz, 0.16, 0.12, 0.72, 10, { ao: false, room, tint: [0.72, 0.7, 0.66] });
    wb.cylinder('ashlar', px, 0.72, pz, 0.12, 0.3, 0.2, 12, { ao: false, room, capBot: true, tint: [0.74, 0.72, 0.68] });
    wb.ring('ashlar', px, 0.92, pz, 0.3, 0.25, 0.04, 12, { room, tint: [0.74, 0.72, 0.68] });
    wb.cylinder('water', px, 0.88, pz, 0.25, 0.25, 0.005, 12, { ao: false, room, capTop: true, grime: false });
    P.colOBB(ctx, px, pz, 0.3, 0.3, 0, 0, 0.96);
    // el cepillo de las limosnas, en su poste
    wb.cylinder('wooddark', 50.8, 0, 13.0, 0.06, 0.05, 0.8, 6, { ao: false, room });
    wb.box('wooddark', 50.6, 0.8, 12.85, 51.0, 1.06, 13.15, { ao: false, room, faces: 'tnsew' });
    wb.box('iron', 50.58, 0.86, 12.83, 51.02, 0.9, 13.17, { ao: false, room, faces: 'nsew' });
    wb.box('black', 50.72, 1.06, 12.98, 50.88, 1.065, 13.02, { ao: false, room, faces: 't', grime: false });
    // la alfombra ante el altar y los reclinatorios ante los bancos
    M.alfombra(ctx, 49, 0, 19.3, 0, 2.6, 1.3, { room, campo: 'clothRed', cenefa: 'clothDark' });
    for (const x of [46.7, 51.3]) for (const z of [15.25, 16.75]) M.escabel(ctx, x, 0, z, 0, { room, w: 1.2 });
    // los hacheros a los lados del altar
    P.candelabra(ctx, 47.5, 0, 20.75, { room });
    P.candelabra(ctx, 50.5, 0, 20.75, { room });
    // los exvotos: las piernas, los brazos y las cabezas de cera colgados
    // junto a las imágenes, con sus cintas
    for (const [x, sx] of [
      [44.62, 1],
      [53.38, -1],
    ])
      for (let k = 0; k < 6; k++) {
        const z = 17.6 + (k % 3) * 0.32,
          yy = 2.2 - Math.floor(k / 3) * 0.42;
        wb.box('clothRed', x + sx * 0.01, yy, z - 0.006, x + sx * 0.02, yy + 0.25, z + 0.006, { ao: false, room, faces: 'nsew' });
        const q = (k * 7 + Math.round(x)) % 3;
        if (q === 0) P.ellipsoid(ctx, 'candle', x + sx * 0.06, yy - 0.08, z, 0.035, 0.11, 0.045, [0.92, 0.86, 0.66], { room });
        else if (q === 1) P.ellipsoid(ctx, 'candle', x + sx * 0.06, yy - 0.05, z, 0.05, 0.06, 0.05, [0.92, 0.86, 0.66], { room });
        else P.ellipsoid(ctx, 'candle', x + sx * 0.05, yy - 0.09, z, 0.03, 0.12, 0.03, [0.92, 0.86, 0.66], { room });
      }
    M.imagenSanto(ctx, 44.62, 0, 16.4, 'e', { room, velas: 3, seed: 4417, tex: 'virgenCarmen' });
    M.imagenSanto(ctx, 53.38, 0, 16.4, 'w', { room, velas: 3, seed: 4418 });
  });
  P.hangingLamp(ctx, 49, 6.0, 16.6, { room, len: 2.0, radius: 7, intensity: 0.8 });
}

void THREE;
void chest;
