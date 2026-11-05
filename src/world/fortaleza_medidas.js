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
  // la poterna de la cocina, en el muro de la despensa (al sur): su centro, su
  // luz, el arranque de su arco y su rosca; sale al corral de la cocina, en el
  // patio de armas
  poterna: { x: -113.0, w: 1.2, h: 2.0, ring: 0.22 },
  // (el cuerpo de guardia, abajo; arriba, a +5,5, la armería, de x0 al tabique,
  // y el taller del ballestero, del tabique a x1: el tabique, de x0 a x1, con su
  // arco lleno de escombro y el que se tapió, en z; la escalera de la guardia,
  // por el muro de poniente, que sube hacia el sur; la puerta de la cámara del
  // torno, en z; el boquete que abrió el bolaño en la muralla, en x, y lo que
  // hundió del suelo del taller)
  guardia: {
    x0: -90,
    x1: -76,
    z0: -44.8,
    z1: -34.4,
    puerta: -82,
    tabique: { x0: -83.2, x1: -82.4, escombro: -42.0, tapiado: -37.4 },
    escalera: { x0: -90, x1: -88.6, z0: -43.6, z1: -37.6, n: 18 },
    torno: -35.6,
    boquete: { x: -81.0, w: 1.6, h: 2.1 },
    hundido: [-80.4, -40.0, -78.0, -37.6],
  },
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
  // cómo acaban (chapitel o almenas); alas: los muros que pone su sala (con
  // sus puertas: el del norte de la de la reina, con la del jardín)
  torres: {
    NO: { x0: -140, x1: -126, z0: -102, z1: -87.2, h: 19, t: 2, techo: 'chapitel', fuera: ['n', 'w'], alas: ['e', 's', 'n'] },
    SO: { x0: -140, x1: -126, z0: -44.8, z1: -30, h: 17, t: 2, techo: 'almenas', fuera: ['s', 'w'], alas: ['e', 'n'] },
    NE: { x0: -76, x1: -62, z0: -102, z1: -86, h: 18, t: 2, techo: 'almenas', fuera: ['n', 'e'], alas: ['w', 'e', 's'] },
    SE: { x0: -76, x1: -62, z0: -46, z1: -32, h: 22, t: 2, techo: 'chapitel', fuera: ['s', 'e'], alas: ['n'] },
  },
  // la puerta: sus dos torres (de x0 a px0 y de px1 a x1), que asoman hasta
  // z1; el paso (de px0 a px1), el arranque de su bóveda y su flecha, el
  // rastrillo (su z); el alto de las torres y el de en medio. Encima del paso,
  // la cámara del torno (su planta por dentro y su techo; su suelo, el de la
  // planta alta de la guardia); el puente levadizo (su ancho, su largo y lo
  // alto de los agujeros de sus cadenas) y el foso que salva, con sus estacas
  // (de x0 a x1, de z0 —al pie del talud de las torres— a z1, y su fondo; a
  // metros enteros, como la losa del suelo)
  puerta: {
    x0: -106,
    x1: -90,
    z0: -46,
    z1: -29,
    px0: -100,
    px1: -96,
    ys: 3.2,
    rise: 2.0,
    rastrillo: -30.7,
    h: 16,
    hm: 14,
    camara: { x0: -104.8, x1: -91.2, z0: -38, z1: -30.2, top: 10.6 },
    puente: { w: 5, len: 5.2, yc: 7.2 },
    foso: { x0: -102, x1: -94, z0: -28, z1: -24, y: -2.6 },
  },
  // el cadalso del alférez: la galería de madera colgada por fuera de la torre
  // de levante de la puerta (de x0 a su esquina) y de la muralla de la guardia
  // (de la esquina a x1), a la altura de la planta alta (y), de w de vuelo; la
  // puerta por la que se sale a él (x, en la cara de la torre) y la garita del
  // alférez, en su cabo (de garita a x1)
  cadalso: { x0: -95.3, x1: -76, w: 1.8, y: 5.5, puerta: -92.2, garita: -77.8 },
  // la torre del homenaje: su planta, el grueso de sus muros, sus pisos, la
  // galería de la sala del trono, la terraza y las garitas; la puerta de la
  // planta de la guardia (a la que da la escalinata). Por dentro: el grueso
  // de los forjados; el muro de carga, de poniente a levante (de z0 a z1), con
  // la puerta de cada planta (en x), que en la sala del trono se abre en tres
  // arcos sobre dos pilares (sus centros, su lado y el arranque de los arcos);
  // la galería en el grueso de los muros de poniente, del norte y de levante
  // (la hoja de fuera, el paso y lo alto de su bóveda); el caracol, en el
  // rincón del noroeste (medio lado de su caja y el grueso de sus muros); la
  // mesa del Rey (world/rey_mesa.js) y el estrado del trono, contra el muro
  // del patio; y en la terraza, el Caballero de la Orden y su pendón
  torre: {
    x0: -111,
    x1: -85,
    z0: -112,
    z1: -86,
    t: 2.6,
    pisos: [0, 6, 12, 18],
    galeria: 22.5,
    terraza: 28,
    garitas: 34,
    puerta: { x: -98, y: 6, w: 1.8, h: 2.6 },
    slab: 0.3,
    muro: { z0: -101.5, z1: -100.5, puertas: [-95, -102, -95], pilares: [-101.6, -94.4], pl: 1.2, ys: 22.2 },
    gal: { hoja: 0.7, paso: 1.2, top: 25.2 },
    caracol: { h: 1.6, t: 0.4 },
    mesa: { x: -98, z: -94.2 },
    estrado: { x0: -102, x1: -94, z0: -91, h: 0.4 },
    caballero: { x: -92, z: -110.3, yaw: 2.71 },
    pendon: { x: -89.9, z: -110.75 },
  },
  // la escalinata: el rellano ante la puerta de la torre (de x0 a x1, hasta
  // z1), sus dos tramos (n peldaños de rise y run, de ancho w) y su pretil
  escalinata: { x0: -101, x1: -95, z1: -82.6, n: 20, rise: 0.3, run: 0.42, w: 2.6 },
  // la puerta de la coracha en la torre del nordeste (su z), a la altura del
  // adarve de la coracha; y lo alto del suelo de esa planta de la torre
  coracha: { z: -95.4, y: 9 },
  // el adarve de levante (fase 4): de la torre de la coracha, por la puerta
  // de su muro del sur a +12 (en x, de ancho w) y el puente de tablas sobre el
  // tejado de la capilla (hasta z0, donde empieza el antepecho), a la terraza
  // de la cancillería; en ella, los peldaños a la puerta del Tombo (en x), a
  // la altura de su planta de las arcas (y)
  adarveE: { puerta: -65.0, w: 1.1, z0: -84.6, tombo: -66.0, y: 13.5 },
  // el jardín del Rey (fortaleza_jardin.js), entre la fortaleza y la muralla
  // norte: la tierra (de x0 a x1, de la muralla, z0, a la fortaleza, z1); la
  // puerta de la torre de la reina (en x); el crucero del jardín de la reina
  // (su centro y el ancho de sus andenes); la alberca (su vaso: aquí cae el
  // Caballero); la escalera del adarve (su pie, en x: sube hacia poniente
  // contra la muralla, de ancho w) y el mirador del Rey (de x0 a x1, volado
  // d sobre el campo); el palomar, el colmenar (a lo largo de la torre de la
  // coracha) y el vivero de los peces
  jardin: {
    x0: -138,
    x1: -62,
    z0: -122,
    z1: -100,
    puerta: { x: -130.6, w: 1.3, h: 2.2 },
    crucero: { x: -124.5, z: -111.5, w: 2.0 },
    alberca: [-106, -118.6, -90, -114.6],
    escalera: { x: -66, n: 25, rise: 0.4, run: 0.4, w: 1.6 },
    mirador: { x0: -101, x1: -95, d: 2.4 },
    palomar: { x0: -82.6, x1: -78.2, z0: -119.6, z1: -115.2, h: 6.6 },
    colmenar: { x0: -75, x1: -66.4 },
    vivero: [-79.5, -110.6, -71.5, -106.2],
  },
  // la muralla norte (level_walls.js): su cara de dentro, su torre de en medio
  // y la de la esquina de poniente; el muro que cierra el jardín por poniente
  norte: { zi: -122, torre: -121, esq: { x: -141, z: -124, w: 8, h: 16 }, oeste: { x0: -141, x1: -138 } },
  // la cárcel de la fortaleza (fase 5; fortaleza_carcel.js), bajo la mitad
  // sur, a y: dos metros más honda que la mazmorra del castillo (yc), con la
  // que da por el rastrillo. Sus muros, en la rejilla de medio metro de las
  // mazmorras (y el hueco del almacén, en la de metro de la losa del suelo);
  // los tramos de las bóvedas, de 4,5:
  // - la bajada, desde la trampilla del almacén de la torre del homenaje: su
  //   escalera (de x0 a x1, de su boca, z0, a ras del almacén, a su pie, z1, en
  //   n peldaños); el hueco del suelo llega casi a la cara del muro del patio
  //   (hueco), y de ahí la escalera baja por debajo de él; la losa del suelo
  //   del mundo (de un metro de grueso) se abre hasta pasado el muro (losa):
  //   entre el hueco y el muro queda una tira de suelo fina;
  // - la sala de los carceleros, al pie, con una bóveda de arista;
  // - la cárcel: tres naves sobre columnas (sus líneas, xs y zs), con las
  //   celdas en las de los lados; en el tramo 'paso' de levante, en vez de
  //   celda, la puerta del aljibe;
  // - el aljibe del palacio, bajo el patio de honor (sus líneas; el andén, de
  //   su muro de poniente a anden; el agua, la marca del lleno y el fondo; el
  //   tramo del óculo, bajo el brocal del patio);
  // - al sur, por el eje (y pasos de ese ancho, como las galerías de la
  //   mazmorra del castillo): el cuarto de los verdugos y, pasado el foso de
  //   la puerta por debajo, la capilla de los reos; de ella, la subida al
  //   rellano del rastrillo (en n peldaños), y el rastrillo, en el muro del
  //   fondo del pasillo de las celdas (de x0 a x1; la reja, en x)
  carcel: {
    y: -7,
    yc: -5,
    bajada: { x0: -107, x1: -105, z0: -93, z1: -84.5, n: 24, hueco: -89, losa: -88 },
    carceleros: { x0: -110.5, x1: -101.5, z0: -84.5, z1: -76 },
    celdas: { xs: [-112, -108.5, -103.5, -100], zs: [-75, -70.5, -66, -61.5, -57, -52.5], paso: 1 },
    aljibe: { xs: [-99, -94.5, -90, -85.5, -81], zs: [-70.5, -66, -61.5, -57, -52.5], anden: -95.5, agua: -8.3, lleno: -7.25, fondo: -9.4, pozo: [2, 2] },
    eje: -97,
    paso: 2,
    verdugos: { x0: -100, x1: -94, z0: -41.5, z1: -29 },
    capilla: { x0: -100.5, x1: -93.5, z0: -15.5, z1: -8.5 },
    subida: { x0: -93.5, x1: -91, n: 8 },
    rellano: { x0: -91, x1: -89.5 },
    rastrillo: { x: -89.25, x0: -89.5, x1: -89, z: -12, w: 2, h: 2.4 },
  },
};
