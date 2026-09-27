// Textos del juego: objetos, documentos y mensajes. Breves, como pidió el diseño:
// la historia se cuenta sobre todo con el escenario.

export const ITEMS = {
  espada: {
    name: 'Espada del carcelero',
    desc: 'Espada larga de la guarnición. La hoja está mellada, pero todavía corta.',
    icon: 'sword',
    key: false,
  },
  escudo: {
    name: 'Escudo de la guardia',
    desc: 'Escudo de lágrima con la cruz de Braga, casi borrada a golpes.',
    icon: 'shield',
    key: false,
  },
  palanca: {
    name: 'Palanca de hierro',
    desc: 'Barra de hierro de la fragua. Sirve para arrancar tablones clavados.',
    icon: 'crowbar',
    key: true,
  },
  llave_claustro: {
    name: 'Llave del claustro',
    desc: 'Llave de bronce ennegrecida. En la anilla, grabado: CLAVSTRVM.',
    icon: 'key',
    key: true,
  },
  manivela: {
    name: 'Manivela del rastrillo',
    desc: 'Manivela de hierro de un torno. Encaja en los mecanismos de reja de la ciudad.',
    icon: 'crank',
    key: true,
  },
  anillo: {
    name: 'Anillo del arzobispo',
    desc: 'Anillo pastoral de oro. El sello tiene la forma del sigilo pintado en las puertas.',
    icon: 'ring',
    key: true,
  },
  ampolla: {
    name: 'Ampolla vacía',
    desc: 'Frasco para las lágrimas de Santa Bárbara. Podrás llevar una ampolla más.',
    icon: 'flaskEmpty',
    key: false,
    upgrade: 'flask',
  },
  relicario: {
    name: 'Relicario de hueso',
    desc: 'Un hueso de santo en una caja de plata. Tu vitalidad aumenta.',
    icon: 'reliquary',
    key: false,
    upgrade: 'hp',
  },
  piedra: {
    name: 'Piedra de afilar bendita',
    desc: 'Afilas la espada con ella. El acero recuerda para qué fue forjado. Tus golpes hacen más daño.',
    icon: 'whetstone',
    key: false,
    upgrade: 'dmg',
  },
};

export const NOTES = {
  carcelero: {
    title: 'Nota del carcelero',
    text: `Tercera noche del asedio.

Los de fuera ya no gritan. Cantan, toda la noche, frente a la muralla, en una lengua que no es de hombres.

El arzobispo bajó otra vez a la cripta con dos canónigos. Sólo subieron ellos dos.

Al preso de la primera celda lo dejo sin comer. Que Dios me perdone: no pienso abrir esa puerta.`,
  },
  madre: {
    title: 'Carta sin terminar',
    text: `Miguel, si vuelves:

Tu hermana dejó de toser anoche. Por la mañana estaba de pie junto a la ventana, mirando hacia la catedral. No contesta. No parpadea.

He clavado la puerta. Ya no sé si es para que no entren o para que no salga.`,
  },
  herrero: {
    title: 'Libro de cuentas del herrero',
    text: `Doce cotas de la guarnición para remendar. En tres había carne dentro. No de muerto: carne que crecía, cosida a las anillas, caliente.

Las eché a la fragua. Gritaron.

Dejo la palanca junto al yunque. Con ella se arrancan los tablones de la barricada de la Calle de los Pellejeros.`,
  },
  canonigo: {
    title: 'Diario del canónigo',
    text: `El arzobispo lo encontró bajo la cripta, en lo que dejaron los romanos: un altar sin nombre. DEO IGNOTO.

Dijo que era un regalo. Que nos protegería del asedio.

Los sitiadores no lo trajeron: lo oyeron. La campana de la catedral tocó sola la noche de la caída, y ellos abrieron nuestras puertas como si alguien los llamara.

Me quedo la llave del claustro. No volveré a bajar.`,
  },
  soldado: {
    title: 'Nota ensangrentada',
    text: `Las puertas de la catedral están atrancadas por dentro. Durante dos días oímos rezar al otro lado.

Después, sólo la campana.`,
  },
  claustro: {
    title: 'Lápida garabateada',
    text: `Enterramos aquí a los hermanos.

Al alba, la tierra estaba removida.

Desde dentro.`,
  },
  muralla: {
    title: 'Orden del alcaide',
    text: `Nadie abre el rastrillo del Postigo. NADIE.

Lo que está clavado en la puerta ya no es uno de los nuestros. Lo atravesaron con una pica y aun así sigue en pie.

Me llevo la manivela del torno conmigo. Que la busquen en mi cadáver.`,
  },
  romana: {
    title: 'Inscripción romana',
    text: `DEO IGNOTO

Debajo, en letra más antigua, alguien ha traducido a carbón:

«Lo que se ofrece a la oscuridad, la oscuridad lo devuelve multiplicado.»`,
  },
  arzobispo: {
    title: 'Últimas palabras del arzobispo',
    text: `Yo abrí la puerta. Le di la ciudad para salvarla.

El Turiferario guarda el camino al río. Arde por mí. Quema el incienso que yo le pedí.

Si eres tú, condenado, tú que no te arrodillaste: toma mi anillo y termina lo que yo no supe terminar.`,
  },
  tabernero: {
    title: 'Cuentas de la taberna del Cuervo',
    text: `Noche de la caída. Seis soldados del adarve. Bebieron sin hablar, mirando hacia la catedral.

Uno pidió que le sirviera también al que se sentaba a su lado. No había nadie a su lado. Le serví.

Pagaron con monedas todavía calientes. He cerrado la bodega: algo rasca las cubas desde dentro.`,
  },
  panadero: {
    title: 'Nota clavada en la artesa',
    text: `La masa no sube. Crece.

Esta mañana la artesa estaba llena hasta el borde y latía bajo el paño.

He encendido el horno para quemarla. Huele a pan. Dios mío, huele a pan.`,
  },
  tejedora: {
    title: 'Hilo para las mortajas',
    text: `Me encargaron doce mortajas para los del adarve. Cosí once.

La duodécima la tejo con el pelo de mi hija, porque el hilo se acabó y la tela sigue pidiendo más.

Si alguien lee esto: no descosáis nada. Lo que va dentro todavía se mueve.`,
  },
  mozo: {
    title: 'Tablilla del mozo de cuadra',
    text: `Los caballos no comen. Miran hacia la catedral y tiemblan.

Anoche el tordo del canónigo se tumbó y no volvió a levantarse. Esta mañana tenía ocho patas.

He echado la tranca de la puerta que da a los Pellejeros. Por aquí no entra nadie más.`,
  },
  celda: {
    title: 'Arañazos en la pared',
    text: `Alguien grabó con las uñas, una y otra vez:

NO TE ARRODILLES`,
  },
};

export const MSG = {
  intro: ['Braga.', 'Tercera noche después de la caída.'],
  lockedKey: (k) => `Cerrada con llave. Necesitas: ${k}.`,
  barred: 'Está atrancada desde el otro lado.',
  boarded: 'La puerta está cegada con tablones clavados. Necesitas algo para arrancarlos.',
  grate: 'Una reja de hierro cierra la escalera. El torno que la levanta no tiene manivela.',
  seal: 'Una losa con el sigilo del Pacto sella el paso. Tiene un hueco del tamaño de un anillo.',
  fog: 'Una niebla blanca y espesa bloquea el paso.',
  noExit: 'El rastrillo está bajado y una masa de carne lo ha soldado a la piedra. Por aquí no se sale.',
  southGate: 'La Puerta Sur está hundida bajo escombros y carne. No hay salida.',
  rest: 'Descansas ante el altar. Las velas vuelven a arder. Las criaturas regresan a sus puestos.',
  died: 'HAS CAÍDO',
};

export const AREA_NAMES = {
  prison: 'Cárcel del Castillo',
  castle: 'Patio del Castillo',
  souto: 'Calle del Soto',
  praca: 'Plaza del Pan',
  ruase: 'Calle de la Catedral',
  largo: 'Plaza de la Catedral',
  cathedral: 'Catedral de Braga',
  cloister: 'Claustro de la Catedral',
  pelames: 'Calle de los Pellejeros',
  tanners: 'Curtidurías',
  canon: 'Casa del Canónigo',
  chapel: 'Capilla de San Fructuoso',
  muralla: 'Calle de la Muralla',
  ramparts: 'Adarve oriental',
  gatehouse: 'Torre del Postigo',
  postigo: 'Callejón del Postigo',
  ferraria: 'Calle de la Herrería',
  smithy: 'Fragua',
  souto_house: 'Casa tapiada',
  crypt: 'Cripta de la Catedral',
  ossuary: 'Osario',
  roman: 'Templo de Bracara',
  tomb: 'Sepulcro del arzobispo',
  arena: 'Cisterna del Dios Desconocido',
  tunnel: 'Galería del río',
  river: 'Orillas del río Este',
  castle_chapel: 'Capilla de la guarnición',
  callejon_pozo: 'Callejón del Pozo',
  pozo: 'Plazuela del Pozo',
  arco: 'Callejón del Arco',
  callejon_se: 'Travesía de la Sé',
  taberna: 'Taberna del Cuervo',
  tejedor: 'Obrador de la tejedora',
  horno: 'Patio del Horno',
  panaderia: 'Horno de pan',
  oratorio: 'Oratorio de Santa Bárbara',
  fragua_callejon: 'Callejón de la Fragua',
  tintoreros: 'Patio de los Tintoreros',
  tintoreria: 'Tintorería',
  corral: 'Corral de los Pellejeros',
  establo: 'Establo',
};
