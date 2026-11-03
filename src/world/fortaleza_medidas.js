// Las medidas de la fortaleza-palacio (PLAN_FORTALEZA.md, §4): de ellas sale
// todo (fortaleza.js, fortaleza_patio.js, fortaleza_alas.js). Norte = -z; la
// ciudad, al este.
export const FORT = {
  // el recinto (las caras de fuera de la muralla), su grueso y el de los muros
  // del patio
  x0: -138,
  x1: -62,
  z0: -100,
  z1: -32,
  t: 2.4,
  ti: 1.2,
  // el adarve, el alero de las crujías (por el patio), el suelo de la planta
  // alta y el talud (su alto y su vuelo)
  walk: 12,
  eave: 9.4,
  F1: 5.5,
  talud: { h: 3.2, d: 0.9 },
  // el patio de honor (de cara a cara de sus muros), el fondo de las galerías
  // del claustro, su arquería (el arranque de los arcos y lo alto de las
  // enjutas) y su tejaroz (de lo alto, contra el muro, a lo bajo)
  patio: { x0: -120, x1: -76, z0: -86, z1: -46 },
  claustro: { d: 4, ys: 3.0, top: 5.0, yHi: 6.5, yLo: 5.3 },
  // el eje: la puerta, el patio, la escalinata y la torre
  eje: -98,
  // las crujías, por dentro (lo que se pisa, de cara a cara de sus muros)
  salon: { x0: -135.6, x1: -121.2, z0: -86, z1: -47.2, ridge: 14.2, puerta: -68, servicio: -123.6, arcos: [-78.2, -70.4, -62.6, -54.8], estrado: { x0: -135.6, x1: -121.2, z0: -86, z1: -82.4, y: 0.45 } },
  // la galería del gran salón, en el grueso del muro de poniente (de x0 a x1;
  // su suelo, el arranque de su bóveda y su clave): de la torre de la reina
  // (z0) a la cocina (z1), con sus arquerías al salón
  galeria: { x0: -137.4, x1: -136.2, y: 5.5, ys: 8.3, top: 8.9, z0: -89.2, z1: -42.8 },
  despensa: { x0: -126, x1: -106, z0: -44.8, z1: -34.4, puerta: -114 },
  guardia: { x0: -90, x1: -76, z0: -44.8, z1: -34.4, puerta: -82 },
  capilla: { x0: -74.8, x1: -64.4, z0: -86, z1: -60.6, ridge: 13.0, puerta: -68 },
  cancilleria: { x0: -74.8, x1: -64.4, z0: -59.4, z1: -46, puerta: -52 },
  // (la reina: el estrado de las damas abajo y su sala a +5,5; en su torre,
  // la del noroeste, tres plantas —la entrada, el oratorio y su cámara— con
  // su techo y la puerta que da a la sala, en z, en las dos primeras)
  reina: { x0: -126, x1: -111, z0: -97.6, z1: -87.2, ridge: 13.0, puerta: -113.4, pisos: [0, 5.5, 11], techo: 15.8, puertaTorre: -94.0 },
  // (el Rey: la antecámara abajo y su cámara a +4,5, a la altura del oratorio
  // de la torre de la coracha —sus plantas: pisos, y el techo de la de arriba—
  // y de la tribuna de la capilla; la escalera de la antecámara, por el muro
  // de la torre del homenaje; la puerta de la cámara a la torre y la del
  // pasadizo, en z)
  rey: { x0: -85, x1: -76, z0: -97.6, z1: -87.2, ridge: 13.0, puerta: -82.8, alto: 4.5, pisos: [0, 4.5, 9], techo: 15.6, puertaTorre: -95.6, pasadizo: -98.79 },
  // las torres de las esquinas: su planta, su alto, el grueso de sus muros y
  // cómo acaban (chapitel o almenas)
  torres: {
    NO: { x0: -140, x1: -126, z0: -102, z1: -87.2, h: 19, t: 2, techo: 'chapitel', fuera: ['n', 'w'], alas: ['e', 's'] },
    SO: { x0: -140, x1: -126, z0: -44.8, z1: -30, h: 17, t: 2, techo: 'almenas', fuera: ['s', 'w'], alas: ['e', 'n'] },
    NE: { x0: -76, x1: -62, z0: -102, z1: -86, h: 18, t: 2, techo: 'almenas', fuera: ['n', 'e'], alas: ['w', 'e', 's'] },
    SE: { x0: -76, x1: -62, z0: -46, z1: -32, h: 22, t: 2, techo: 'chapitel', fuera: ['s', 'e'], alas: ['n'] },
  },
  // la puerta: sus dos torres (de x0 a px0 y de px1 a x1), que asoman hasta
  // z1; el paso (de px0 a px1), el arranque de su bóveda y su flecha, el
  // rastrillo (su z) y el puente alzado; el alto de las torres y el de en medio
  puerta: { x0: -106, x1: -90, z0: -46, z1: -29, px0: -100, px1: -96, ys: 3.6, rise: 2.0, rastrillo: -30.7, h: 16, hm: 14 },
  // la torre del homenaje: su planta, el grueso de sus muros, sus pisos, la
  // galería de la sala del trono, la terraza y las garitas; la puerta de la
  // planta de la guardia (a la que da la escalinata)
  torre: { x0: -111, x1: -85, z0: -112, z1: -86, t: 2.6, pisos: [0, 6, 12, 18], galeria: 22.5, terraza: 28, garitas: 34, puerta: { x: -98, y: 6, w: 1.8, h: 2.6 } },
  // la escalinata: el rellano ante la puerta de la torre (de x0 a x1, hasta
  // z1), sus dos tramos (n peldaños de rise y run, de ancho w) y su pretil
  escalinata: { x0: -101, x1: -95, z1: -82.6, n: 20, rise: 0.3, run: 0.42, w: 2.6 },
  // la puerta de la coracha en la torre del nordeste (su z), a la altura del
  // adarve de la coracha; y lo alto del suelo de esa planta de la torre
  coracha: { z: -95.4, y: 9 },
  // la muralla norte (level_walls.js): su cara de dentro, su torre de en medio
  // y la de la esquina de poniente; el muro que cierra el jardín por poniente
  norte: { zi: -122, torre: -121, esq: { x: -141, z: -124, w: 8, h: 16 }, oeste: { x0: -141, x1: -138 } },
};
