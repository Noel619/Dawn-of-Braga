// La página de la hoja de ruta (docs/hoja-de-ruta/index.html) y la sección
// del README, desde los datos (datos.mjs), el arte de la interfaz (arte.js) y
// los sprites del juego (modelos.mjs). Una sola página, sin nada de fuera: las
// fuentes y los sprites van dentro. Los sprites se amplían siempre a un número
// entero de píxeles de pantalla (--k: 1 en el teléfono, 2 en una pantalla
// grande), como la interfaz del juego.

const REPO = 'https://github.com/Noel619/Dawn-of-Braga/blob/HEAD/';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (x) => Math.round(x * 100);

// El progreso de una lista de tareas (sin las opcionales).
export function progreso(tareas) {
  const t = tareas.filter((x) => !(x[2] && x[2].opcional));
  const hecho = t.reduce((a, x) => a + x[1], 0);
  return { hecho, total: t.length, frac: t.length ? hecho / t.length : 0 };
}
// El estado de una fase: el que diga, o el de su progreso.
export function estadoDe(f) {
  if (f.estado) return f.estado;
  const p = progreso(f.tareas);
  return p.frac >= 1 ? 'hecha' : p.frac > 0 ? 'curso' : 'pendiente';
}
export const ESTADOS = {
  hecha: 'Hecha',
  curso: 'En curso',
  siguiente: 'La siguiente',
  espera: 'Espera al autor',
  pendiente: 'Por hacer',
  'mas-adelante': 'Más adelante',
  descartado: 'Descartado por ahora',
  secuela: 'La segunda parte',
};
// (el color de la barra y del medallón de cada estado)
export const TONO = { hecha: 'hecha', curso: 'curso', siguiente: 'siguiente', espera: 'espera', pendiente: 'pendiente', 'mas-adelante': 'mas', descartado: 'pendiente', secuela: 'mas' };
const tonoBarra = (e) => (e === 'hecha' ? 'hecha' : e === 'mas-adelante' || e === 'secuela' ? 'mas' : 'curso');

// Un sprite: un <img> ampliado k veces (k: número o var(--k)).
function spr(o, { k = 'var(--k)', cls = '', alt = '', titulo = '' } = {}) {
  if (!o) return '';
  return `<img class="px ${cls}" src="${o.url}" width="${o.w}" height="${o.h}" style="width:calc(${o.w}px * ${k})" alt="${esc(alt)}"${titulo ? ` title="${esc(titulo)}"` : ''} loading="lazy" decoding="async">`;
}
const enlace = (ruta) => {
  const [file, ...rest] = ruta.split(/,\s*/);
  const f = file.split(' ')[0];
  return `<a href="${REPO}${f}"><code>${esc(f)}</code></a>${rest.length ? ', ' + esc(rest.join(', ')) : esc(file.slice(f.length))}`;
};

function marca(A, h) {
  const m = h >= 1 ? A.marcas.hecha : h > 0 ? A.marcas.media : A.marcas.no;
  return spr(m, { cls: 'marca', alt: h >= 1 ? 'Hecho: ' : h > 0 ? 'A medias: ' : 'Por hacer: ' });
}
function tareas(A, lista) {
  return `<ul class="tareas">${lista
    .map(([t, h, o]) => `<li class="${h >= 1 ? 'si' : h > 0 ? 'media' : 'no'}${o && o.opcional ? ' opc' : ''}">${marca(A, h)}<span>${esc(t)}${o && o.opcional ? ' <em>(opcional)</em>' : ''}</span></li>`)
    .join('')}</ul>`;
}

// El reparto de una fase: sus sprites de pie delante de su escena.
function reparto(S, ids, k, { pequenos = true } = {}) {
  if (!ids.length) return '';
  return `<div class="reparto">${ids.map((id) => spr(pequenos ? S.mini[id] : S.modelos[id], { k, alt: '' })).join('')}</div>`;
}
function iconos(A, ids, k = 1, nombres = {}) {
  if (!ids.length) return '';
  return `<div class="iconos">${ids.map((n) => spr(A.iconos[n], { k, alt: nombres[n] || '', titulo: nombres[n] || '' })).join('')}</div>`;
}
function planes(f) {
  const ps = [f.plan, f.plan2].filter(Boolean);
  if (!ps.length) return '';
  return `<p class="plan"><span class="et">Plan</span> ${ps.map(enlace).join(' · ')}</p>`;
}

// Lo que la página le pide a arte.js: los títulos, los medallones, las barras,
// la cifra grande y los iconos.
export const NUM_EXP = ['I', 'II', '?'];
export function necesidades(D, C) {
  const med = new Set(),
    bar = new Map(),
    ico = new Set();
  const conBarra = (tareas, tono) => {
    const p = progreso(tareas);
    bar.set(`fase:${pct(p.frac)}:${tono}`, [p.frac, 120, tono, 11]);
    bar.set(`mini:${pct(p.frac)}:${tono}`, [p.frac, 48, tono, 7]);
  };
  for (const f of D.FASES) {
    const e = estadoDe(f);
    med.add(f.num + ':' + TONO[e]);
    conBarra(f.tareas, tonoBarra(e));
    f.iconos.forEach((n) => ico.add(n));
  }
  D.EXPANSIONES.forEach((x, i) => {
    med.add(NUM_EXP[i] + ':' + TONO[x.estado]);
    if (x.tareas.length) conBarra(x.tareas, 'mas');
    x.iconos.forEach((n) => ico.add(n));
  });
  bar.set('global', [C.global.frac, 240, 'curso', 15]);
  for (const n of ['farol', 'claw', 'colmillo', 'sword', 'helm', 'reliquary', 'note', 'flask', 'tear', 'hammer', 'whetstone', 'none']) ico.add(n);
  for (const a of C.contenido.armas) ico.add(a.icono);
  for (const r of C.contenido.reliquias) ico.add(r.icono);
  return {
    titulos: { camino: ['El camino', 'dark'], hecho: ['Lo que ya está', 'gold'], viene: ['Lo que viene', 'ember'], mas: ['Más allá de la 1.0', 'ember'], decidir: ['Por decidir', 'dark'], juego: ['El juego hoy', 'dark'], bestiario: ['Bestiario', 'ember'] },
    medallones: [...med].map((k) => k.split(':')),
    barras: [...bar].map(([k, v]) => [k, ...v]),
    cifras: { global: pct(C.global.frac) + ' %' },
    iconos: [...ico],
  };
}

// ---------------------------------------------------------------- piezas
function portada(D, A, S, C) {
  const P = C.global;
  return `<header class="portada">
  <div class="cielo" style="background-image:url(${S.escenas.portada.url})" role="img" aria-label="Los tejados de Braga en la niebla, desde el adarve de levante de la fortaleza (una vista del juego)"></div>
  <div class="portada-in">
    <h1 class="logo">${spr(A.logo, { k: 'var(--kl)', alt: 'Dawn of Braga · Amanecer en Braga' })}</h1>
    <p class="kicker">Hoja de ruta <span>·</span> al día el ${esc(D.FECHA)}</p>
    <div class="global marco">
      <div class="global-cifra">${spr(A.cifras.global, { alt: pct(P.frac) + ' %' })}<p><strong>hacia la 1.0</strong><span>${fmt(P.hecho)} de ${P.total} tareas · ${C.fasesHechas} de ${D.FASES.length} fases hechas</span></p></div>
      ${spr(A.barras.global, { cls: 'barra-global', alt: '' })}
      <p class="siguiente">${spr(A.cursor, { alt: '' })} Lo siguiente: <a href="#fase-${C.siguiente.id}">${esc(C.siguiente.nombre.toLowerCase())}, ${esc(C.siguiente.lema.split(':')[0].toLowerCase())}</a></p>
    </div>
  </div>
</header>`;
}
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ','));

function indice() {
  const L = [
    ['camino', 'El camino'],
    ['hecho', 'Lo que ya está'],
    ['viene', 'Lo que viene'],
    ['mas', 'Más allá de la 1.0'],
    ['decidir', 'Por decidir'],
    ['juego', 'El juego hoy'],
    ['bestiario', 'Bestiario'],
  ];
  return `<nav class="indice" aria-label="Secciones"><ul>${L.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ul></nav>`;
}

function titulo(A, id, alt) {
  return `<h2 class="titulo">${spr(A.titulos[id], { alt })}</h2>`;
}

function camino(D, A) {
  const paso = (f, num, estado, p, href, nombre) => `<li class="paso ${TONO[estado]}">
      <a href="${href}">${spr(A.medallones[num + ':' + TONO[estado]], { cls: 'med', alt: '' })}<span class="n">${esc(nombre)}</span>${p ? spr(A.barras[`mini:${pct(p.frac)}:${tonoBarra(estado)}`], { cls: 'mini', alt: '' }) : '<span class="sin"></span>'}<span class="p">${p ? pct(p.frac) + ' %' : esc(ESTADOS[estado])}</span></a></li>`;
  return `<section id="camino" class="envoltura">
  ${titulo(A, 'camino', 'El camino')}
  <p class="intro">Catorce fases hasta la 1.0: las que ya están en el juego, la que toca ahora y las que esperan. Y, después, lo que vendrá.</p>
  <ol class="camino">${D.FASES.map((f) => paso(f, f.num, estadoDe(f), progreso(f.tareas), '#fase-' + f.id, f.nombre)).join('')}</ol>
  <h3 class="sub-camino">Más allá de la 1.0</h3>
  <ol class="camino mas">${D.EXPANSIONES.map((x, i) => paso(x, NUM_EXP[i], x.estado, x.tareas.length ? progreso(x.tareas) : null, '#exp-' + x.id, x.nombre)).join('')}</ol>
</section>`;
}

// La tarjeta de una fase. grande: las de lo que viene (la escena a k; las
// tareas, a la vista).
function fase(D, A, S, f, grande) {
  const e = estadoDe(f);
  const p = progreso(f.tareas);
  const k = grande ? 'var(--k)' : '1';
  const esc_ = f.escena && S.escenas[f.escena];
  let lamina;
  if (esc_) lamina = `<div class="esc">${spr(esc_, { k, alt: 'Una vista del juego: ' + f.nombre })}${reparto(S, f.sprites, k)}</div>`;
  else if (f.id === 'armas') lamina = `<div class="placa">${reparto(S, f.sprites, k, { pequenos: false })}</div>`;
  else if (f.id === 'movil') lamina = `<div class="placa movil">${spr(S.icono, { k, alt: 'El icono de la web instalable: la gran espada de la portada sobre el estandarte' })}<p>Se instala como una app en el iPhone y en Android, a pantalla completa y sin red, y se juega con los controles táctiles o un mando.</p></div>`;
  else if (!grande) lamina = `<div class="placa">${iconos(A, f.iconos, 2)}</div>`;
  else lamina = '';
  const lista = tareas(A, f.tareas);
  const texto = grande && f.texto ? `<p class="texto-fase">${esc(f.texto)}</p>` : '';
  const izq = grande ? (lamina ? `<div class="izq">${lamina}${texto}</div>` : '') : lamina;
  return `<article class="fase ${grande ? 'grande' : ''} ${grande && !lamina ? 'sin-esc' : ''} e-${TONO[e]}" id="fase-${f.id}">
    ${izq}
    <div class="fase-txt">
      <div class="cab">${spr(A.medallones[f.num + ':' + TONO[e]], { k, cls: 'med', alt: 'Fase ' + f.num })}<div><h3>${esc(f.nombre)}</h3><p class="lema">${esc(f.lema)}</p></div></div>
      <p class="meta"><span class="estado ${TONO[e]}">${esc(ESTADOS[e])}</span> <span class="cuando">${esc(f.cuando)}</span></p>
      <div class="avance">${spr(A.barras[`fase:${pct(p.frac)}:${tonoBarra(e)}`], { k, cls: 'barra', alt: '' })}<span class="cifra">${pct(p.frac)} %</span><span class="de">${fmt(p.hecho)} de ${p.total}</span></div>
      ${esc_ || f.id === 'armas' ? iconos(A, f.iconos, 1) : grande ? iconos(A, f.iconos, 'var(--k)') : ''}
      ${grande && !lamina ? texto : ''}
      ${grande ? lista : `<details><summary>Lo que tiene (${p.total})</summary>${lista}</details>`}
      ${planes(f)}
    </div>
  </article>`;
}

function hecho(D, A, S) {
  const fs = D.FASES.filter((f) => estadoDe(f) === 'hecha');
  return `<section id="hecho" class="envoltura">
  ${titulo(A, 'hecho', 'Lo que ya está')}
  <p class="intro">Lo que ya se juega, de la celda al río. Cada fase, con una vista suya sacada del juego y su gente delante.</p>
  <div class="hechas">${fs.map((f) => fase(D, A, S, f, false)).join('')}</div>
</section>`;
}

function viene(D, A, S) {
  const orden = ['siguiente', 'espera', 'curso', 'pendiente'];
  const fs = D.FASES.filter((f) => estadoDe(f) !== 'hecha').sort((a, b) => orden.indexOf(estadoDe(a)) - orden.indexOf(estadoDe(b)));
  return `<section id="viene" class="envoltura">
  ${titulo(A, 'viene', 'Lo que viene')}
  <p class="intro">Lo que falta para la 1.0, por orden: lo que toca ahora, lo que espera a una decisión y lo que queda por pulir.</p>
  ${fs.map((f) => fase(D, A, S, f, true)).join('')}
</section>`;
}

function mas(D, A, S) {
  const card = (x) => {
    const p = x.tareas.length ? progreso(x.tareas) : null;
    const t = TONO[x.estado];
    const cabeza =
      x.id === 'devil'
        ? `<div class="devil">${spr(A.logoDevil, { alt: 'Dawn of the Devil, el principio de la segunda parte' })}</div>`
        : `<div class="cab">${spr(A.medallones[NUM_EXP[D.EXPANSIONES.indexOf(x)] + ':' + t], { cls: 'med', alt: '' })}<div><p class="num">${esc(x.num)}</p><h3>${esc(x.nombre)}</h3><p class="lema">${esc(x.lema)}</p></div></div>`;
    return `<article class="exp e-${t} x-${x.id}" id="exp-${x.id}">
      ${cabeza}
      <p class="meta"><span class="estado ${x.estado}">${esc(ESTADOS[x.estado])}</span></p>
      ${iconos(A, x.iconos, 'var(--k)')}
      <p class="texto">${esc(x.texto)}</p>
      ${p ? `<div class="avance">${spr(A.barras[`fase:${pct(p.frac)}:mas`], { cls: 'barra', alt: '' })}<span class="cifra">${pct(p.frac)} %</span><span class="de">${fmt(p.hecho)} de ${p.total}</span></div>${tareas(A, x.tareas)}` : ''}
      <p class="plan"><span class="et">Dónde</span> ${enlace(x.plan)}</p>
    </article>`;
  };
  return `<section id="mas" class="envoltura">
  ${titulo(A, 'mas', 'Más allá de la 1.0')}
  <p class="intro">Lo que viene después del final: lo que está escrito en los planes, sin fecha. No cuenta para la 1.0.</p>
  <div class="exps">${D.EXPANSIONES.map(card).join('')}</div>
</section>`;
}

function decidir(D, A) {
  return `<section id="decidir" class="envoltura">
  ${titulo(A, 'decidir', 'Por decidir')}
  <p class="intro">Lo que tiene que decidir el autor para que el trabajo siga.</p>
  <div class="notas">${D.DECISIONES.map(
    (d) => `<article class="nota">
      ${spr(A.sello, { k: 'var(--k)', cls: 'sello', alt: '' })}
      <h3>${esc(d.que)}</h3>
      <p class="pregunta">${esc(d.pregunta)}</p>
      <p>${esc(d.mas)}</p>
      <p class="donde">${enlace(d.donde)}</p>
    </article>`
  ).join('')}</div>
</section>`;
}

function juego(D, A, S, C) {
  const K = C.contenido;
  const tiles = [
    ['farol', K.zonas, 'zonas con nombre'],
    ['claw', K.jefes.length, 'jefes', 'y la Corte, el alférez, la Bestia y el gigante'],
    ['colmillo', C.criaturas, 'criaturas'],
    ['sword', K.armas.length, 'armas'],
    ['helm', K.armaduras.length, 'armaduras', `${K.armaduras.length * 4} piezas`],
    ['reliquary', K.reliquias.length, 'objetos benditos'],
    ['note', K.documentos, 'documentos'],
    ['flask', K.objetos, 'objetos'],
    ['tear', C.temas, 'temas de música', 'compuestos por código'],
    ['hammer', C.lineas.toLocaleString('es-ES'), 'líneas de código', `en ${C.archivos} archivos`],
    ['whetstone', C.herramientas, 'herramientas de prueba'],
    ['none', 0, 'archivos de imagen, modelo o sonido', 'todo se genera por código'],
  ];
  const armas = K.armas.map((a) => `<li>${spr(A.iconos[a.icono], { alt: '' })}<span>${esc(a.nombre)}</span></li>`).join('');
  const PESO = { ligera: 'ligera', media: 'media', pesada: 'pesada' };
  const arm = [['cuerpo', 'Sin armadura', 'el cuerpo de quien eras']].concat(K.armaduras.map((a) => [{ guardia: 'guardia', caballero: 'caballeroJ', cuero: 'cuero' }[a.id], a.nombre, PESO[a.peso] || a.peso]));
  const reliq = K.reliquias.map((r) => `<li>${spr(A.iconos[r.icono], { alt: '' })}<span>${esc(r.nombre)}</span></li>`).join('');
  return `<section id="juego" class="envoltura">
  ${titulo(A, 'juego', 'El juego hoy')}
  <p class="intro">Contado de su propio código el ${esc(D.FECHA)}. Todo lo que se ve aquí lo ha dibujado el juego: los iconos, los marcos, las letras y los modelos.</p>
  <ul class="cifras">${tiles.map(([ic, n, t, s]) => `<li class="marco-fino">${spr(A.iconos[ic], { alt: '' })}<span class="n">${esc(String(n))}</span><span class="t">${esc(t)}</span>${s ? `<span class="s">${esc(s)}</span>` : ''}</li>`).join('')}</ul>
  <h3 class="sub">La armería</h3>
  <ul class="armeria">${armas}</ul>
  <ul class="armaduras">${arm.map(([id, n, s]) => `<li><div class="fig">${spr(S.modelos[id], { k: 1, alt: '' })}</div><span class="n">${esc(n)}</span><span class="s">${esc(s)}</span></li>`).join('')}</ul>
  <h3 class="sub">Los objetos benditos</h3>
  <ul class="armeria">${reliq}</ul>
</section>`;
}

function bestiario(D, A, S) {
  const M = D.MODELOS;
  const jefe = (id) => {
    const m = M[id];
    return `<li class="jefe marco-fino"><div class="fig">${spr(S.modelos[id], { alt: m.nombre || S.nombres[id] })}</div><h4>${esc(m.nombre || S.nombres[id])}</h4><p class="lugar">${esc(m.donde || '')}</p>${m.nota ? `<p class="nota-j">${esc(m.nota)}</p>` : ''}</li>`;
  };
  const cri = (id) => `<li><div class="fig">${spr(S.mini[id], { k: 'var(--k)', alt: S.nombres[id] })}</div><span>${esc(S.nombres[id])}</span></li>`;
  return `<section id="bestiario" class="envoltura">
  ${titulo(A, 'bestiario', 'Bestiario')}
  <p class="intro">Los jefes, la gente y las criaturas de Braga, fotografiados con sus modelos del juego, su postura y su luz.</p>
  <div class="desfile" role="img" aria-label="Los ${D.JEFES.length} jefes de Braga, de pie en dos filas">${[D.JEFES.slice(0, Math.ceil(D.JEFES.length / 2)), D.JEFES.slice(Math.ceil(D.JEFES.length / 2))]
    .map((fila) => `<div class="fila">${fila.map((id) => spr(S.modelos[id], { k: 1, alt: '', titulo: D.MODELOS[id].nombre || S.nombres[id] })).join('')}</div>`)
    .join('')}</div>
  <h3 class="sub">Los jefes</h3>
  <ul class="jefes">${D.JEFES.map(jefe).join('')}</ul>
  <h3 class="sub">La gente</h3>
  <ul class="jefes gente">${D.PERSONAJES.map(jefe).join('')}</ul>
  <h3 class="sub">Las criaturas</h3>
  <ul class="criaturas">${D.CRIATURAS.map(cri).join('')}</ul>
</section>`;
}

function como(D, C) {
  return `<section id="como" class="envoltura como">
  <h2 class="titulo-txt">Cómo se hace esta hoja</h2>
  <p>Cada fase tiene sus tareas, sacadas del orden de trabajo de su plan. Una tarea hecha cuenta 1; a medias, la mitad; las opcionales no cuentan. El progreso de una fase es lo hecho entre lo que hay, y el de la 1.0, lo mismo con las ${C.global.total} tareas de las ${D.FASES.length} fases: cada tarea pesa igual, sea un acto de la película o una prueba. Las expansiones no cuentan para la 1.0.</p>
  <p>Los datos están en <a href="${REPO}tools/hoja_de_ruta/datos.mjs"><code>tools/hoja_de_ruta/datos.mjs</code></a>, lo único que se toca a mano; la página, sus imágenes y la sección del README se generan con <code>node tools/hoja_de_ruta.mjs</code>. Los planes vivos están en la raíz del repositorio; los hechos, en <a href="${REPO}planes_jubilados/README.md"><code>planes_jubilados/</code></a>; los fallos sueltos, en <a href="${REPO}bugs_y_correciones.txt"><code>bugs_y_correciones.txt</code></a>.</p>
</section>`;
}

// ---------------------------------------------------------------- página
export function pagina({ D, A, S, C, F }) {
  const css = estilos(A, F);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hoja de ruta · Dawn of Braga</title>
<meta name="description" content="La hoja de ruta de Dawn of Braga: ${pct(C.global.frac)} % hacia la 1.0, sus fases, lo que viene, el bestiario y las expansiones, con el arte del propio juego.">
<meta name="theme-color" content="#0d0b0a">
<link rel="icon" href="${S.icono.url}">
<style>${css}</style>
</head>
<body>
${portada(D, A, S, C)}
${indice()}
<main>
${camino(D, A)}
${hecho(D, A, S)}
${viene(D, A, S)}
${mas(D, A, S)}
${decidir(D, A)}
${juego(D, A, S, C)}
${bestiario(D, A, S)}
${como(D, C)}
</main>
<footer class="pie">
  ${spr(A.separador, { k: 'var(--k)', alt: '' })}
  <p>Hecha por código con el arte del propio juego (<code>ui/pixel.js</code>, <code>game/icons.js</code> y sus modelos), como todo lo demás · ${esc(D.FECHA)}</p>
</footer>
</body>
</html>
`;
}

function estilos(A, F) {
  const ff = (fam, b64) => `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-display:block}`;
  return `${ff('Bastarda', F.bastarda)}${ff('Handjet', F.handjet)}${ff('Silkscreen', F.silkscreen)}
:root{color-scheme:dark;--void:#060505;--ink0:#0d0b0a;--ink1:#16120f;--ink2:#1f1a16;--ink3:#2a231d;--bone:#d6cbb4;--bone-hi:#f0e7d2;--ash:#a89c85;--dim:#7a705e;--gold:#d0a24c;--gold-hi:#f5d88a;--gold-lo:#9c7432;--ember:#f2a445;--ember-lo:#cf6d22;--blood:#b8301f;--blood-hi:#e8603f;--iron:#6c645b;--k:1;--kl:1;--gut:16px;--marco:url(${A.marco.url});--perg:url(${A.pergamino.url})}
@media (min-width:760px){:root{--k:2;--kl:2;--gut:28px}}
*{box-sizing:border-box}
html{background:var(--void);-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;color:var(--bone);font:21px/1.3 'Handjet',monospace;-webkit-font-smoothing:none;font-smooth:never;background:var(--ink0) url(${A.fondo.url}) repeat;background-size:calc(96px * var(--k));image-rendering:pixelated;overflow-x:hidden}
img{image-rendering:pixelated;image-rendering:crisp-edges;max-width:100%;height:auto}
img.px{display:block}
a{color:var(--gold-hi);text-decoration-color:var(--gold-lo);text-underline-offset:3px}
a:hover{color:var(--bone-hi)}
a:focus-visible{outline:2px solid var(--ember);outline-offset:3px}
code{font:inherit;color:var(--ash)}
em{font-style:normal;color:var(--dim)}
h1,h2,h3,h4,p{margin:0}
.envoltura{max-width:1180px;margin:0 auto;padding:44px var(--gut) 8px}
section,article{scroll-margin-top:52px}
.marco{border:calc(14px * var(--k)) solid transparent;border-image:var(--marco) 14 fill / calc(14px * var(--k)) round}
.marco-fino{border:14px solid transparent;border-image:var(--marco) 14 fill / 14px round}
.et,.estado,.p,.cuando,.de,.donde,.s,.kicker,.num,.sub-camino,.indice a{font-family:'Silkscreen',monospace;font-size:16px;line-height:1.2;text-transform:uppercase;letter-spacing:1px}
.titulo{display:flex;justify-content:center;margin-bottom:10px}
.titulo-txt{font:39px/1.1 'Bastarda',serif;color:var(--gold-hi);text-align:center;margin-bottom:14px;text-shadow:2px 2px 0 var(--void)}
.intro{text-align:center;color:var(--ash);max-width:62ch;margin:0 auto 26px}
.sub{font:39px/1.1 'Bastarda',serif;color:var(--gold-hi);text-shadow:2px 2px 0 var(--void);margin:34px 0 14px;text-align:center}
/* portada */
.portada{position:relative;isolation:isolate;overflow:hidden;display:grid;place-items:center;text-align:center;padding:calc(20px * var(--k)) var(--gut) 30px;min-height:calc(290px * var(--k))}
.portada .cielo{position:absolute;inset:0;background-size:cover;background-position:center 30%;image-rendering:pixelated;z-index:-2}
.portada::after{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 50% 30%,rgba(6,5,5,0) 0%,rgba(6,5,5,.25) 55%,rgba(6,5,5,.75) 100%),linear-gradient(180deg,rgba(6,5,5,.1) 0%,rgba(6,5,5,.2) 50%,rgba(13,11,10,.97) 100%)}
.portada-in{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}
.logo img{margin:0 auto;filter:drop-shadow(0 6px 10px rgba(0,0,0,.6))}
.kicker{color:var(--bone-hi);text-shadow:2px 2px 0 var(--void)}
.kicker span{color:var(--gold)}
.global{width:min(100%,calc(330px * var(--k)));padding:6px 10px 8px;display:flex;flex-direction:column;align-items:center;gap:10px}
.global-cifra{display:flex;align-items:center;gap:14px;justify-content:center;flex-wrap:wrap}
.global-cifra p{display:flex;flex-direction:column;text-align:left}
.global-cifra strong{font:34px/1 'Handjet',monospace;color:var(--gold-hi);text-shadow:2px 2px 0 var(--void)}
.global-cifra span{color:var(--ash)}
.barra-global{margin:0 auto}
.siguiente{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}
.siguiente img{display:inline-block}
/* índice */
.indice{position:sticky;top:0;z-index:5;background:rgba(6,5,5,.92);border-top:2px solid var(--ink3);border-bottom:2px solid var(--ink3);backdrop-filter:blur(2px)}
.indice ul{list-style:none;margin:0 auto;padding:10px var(--gut);max-width:1180px;display:flex;gap:6px 22px;overflow-x:auto;scrollbar-width:none;white-space:nowrap}
.indice a{color:var(--ash);text-decoration:none;display:inline-block;padding:4px 0}
.indice a:hover,.indice a:focus-visible{color:var(--gold-hi)}
/* el camino */
.camino{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:22px 8px}
@media (min-width:560px){.camino{grid-template-columns:repeat(4,1fr)}}
@media (min-width:860px){.camino{grid-template-columns:repeat(7,1fr)}}
.camino.mas{grid-template-columns:repeat(3,1fr);max-width:calc(3 * 170px);margin:0 auto}
.paso a{display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none;color:var(--bone);text-align:center;padding:4px 2px}
.paso a:hover .n,.paso a:focus-visible .n{color:var(--gold-hi)}
.paso .n{font:21px/1.1 'Handjet',monospace;min-height:2.2em;display:flex;align-items:center}
.paso .p{color:var(--gold)}
.paso.curso .p,.paso.siguiente .p{color:var(--ember)}
.paso.espera .p,.paso.pendiente .p{color:var(--dim)}
.paso.mas .p{color:var(--blood-hi)}
.paso .sin{height:calc(7px * var(--k))}
.sub-camino{text-align:center;color:var(--blood-hi);margin:34px 0 18px}
/* tarjetas de fase */
.hechas{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,350px),1fr));gap:22px}
.fase{border:14px solid transparent;border-image:var(--marco) 14 fill / 14px round;display:flex;flex-direction:column;gap:12px;padding:4px 4px 8px}
.fase .esc{position:relative;margin:0 auto;max-width:100%;line-height:0}
.fase .esc>img{outline:2px solid var(--void)}
.reparto{position:absolute;left:0;right:0;bottom:-8px;display:flex;justify-content:center;align-items:flex-end;pointer-events:none}
.reparto img{margin:0 -6px;filter:drop-shadow(0 3px 0 rgba(6,5,5,.7))}
.placa{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:flex-end;padding:12px 6px;background:radial-gradient(ellipse at 50% 100%,rgba(207,109,34,.18),rgba(6,5,5,0) 70%)}
.placa .reparto{position:static}
.placa.movil{flex-direction:column;align-items:center;text-align:center;gap:12px;color:var(--ash)}
.placa .iconos{justify-content:center}
.cab{display:flex;align-items:center;gap:12px}
.cab h3{font:26px/1.1 'Bastarda',serif;color:var(--bone-hi);text-shadow:2px 2px 0 var(--void)}
.lema{color:var(--ash)}
.meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.estado{display:inline-block;padding:5px 8px 4px;border:2px solid currentColor}
.estado.hecha{color:var(--gold)}
.estado.curso{color:var(--ember)}
.estado.siguiente{color:var(--void);background:var(--ember);border-color:var(--ember)}
.estado.espera{color:var(--bone)}
.estado.pendiente,.estado.descartado{color:var(--dim)}
.estado.mas,.estado.mas-adelante,.estado.secuela{color:var(--blood-hi)}
.cuando{color:var(--dim)}
.avance{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.avance .cifra{font:34px/1 'Handjet',monospace;color:var(--gold-hi)}
.e-curso .avance .cifra,.e-siguiente .avance .cifra,.e-espera .avance .cifra,.e-pendiente .avance .cifra{color:var(--ember)}
.e-mas .avance .cifra{color:var(--blood-hi)}
.de{color:var(--dim)}
.iconos{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
details summary{cursor:pointer;color:var(--gold);list-style:none;display:inline-flex;align-items:center;gap:6px}
details summary::-webkit-details-marker{display:none}
details summary::before{content:"▸";color:var(--gold-lo)}
details[open] summary::before{content:"▾"}
.tareas{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.tareas li{display:grid;grid-template-columns:calc(9px * var(--k)) 1fr;gap:10px;align-items:start}
.tareas .marca{margin-top:calc(4px * var(--k) + 1px)}
.tareas li.no span{color:var(--ash)}
.tareas li.opc span{color:var(--dim)}
.plan{color:var(--ash);overflow-wrap:anywhere}
.plan .et{color:var(--dim);margin-right:6px}
.fase.grande{border-width:calc(14px * var(--k));border-image-width:calc(14px * var(--k));margin-bottom:26px;padding:6px}
.fase.grande .tareas{gap:7px}
.fase.grande .avance .de{flex-basis:100%;margin-top:-6px}
.izq{display:flex;flex-direction:column;gap:18px}
.texto-fase{color:var(--bone);max-width:62ch}
.izq .texto-fase{color:var(--ash);padding:0 4px}
@media (min-width:1180px){.fase.grande{display:grid;grid-template-columns:auto 1fr;align-items:start;gap:22px}.fase.grande.sin-esc{display:flex}.izq .texto-fase{max-width:calc(320px * var(--k))}}
.fase.e-siguiente{box-shadow:0 0 0 2px rgba(242,164,69,.35),0 0 40px rgba(207,109,34,.25)}
/* expansiones */
.exps{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:22px}
.exp{border:14px solid transparent;border-image:var(--marco) 14 fill / 14px round;display:flex;flex-direction:column;gap:12px;padding:4px 4px 8px}
.exp .num{color:var(--blood-hi)}
.exp .texto{color:var(--bone)}
.exp.x-finales{opacity:.8}
.exp.x-devil{background:radial-gradient(ellipse at 50% 30%,rgba(184,48,31,.28),rgba(6,5,5,0) 70%)}
.exp.x-devil .devil{display:flex;justify-content:center;padding:8px 0}
@media (min-width:760px){.exp.x-devil{grid-column:1/-1}.exp.x-devil .texto{max-width:62ch;margin:0 auto;text-align:center}.exp.x-devil .meta,.exp.x-devil .plan{justify-content:center;text-align:center}}
/* por decidir */
.notas{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:22px}
.nota{position:relative;color:#2a1a10;border:18px solid transparent;border-image:var(--perg) 18 fill / 18px round;padding:6px 8px 10px;display:flex;flex-direction:column;gap:8px}
.nota h3{font:26px/1.1 'Bastarda',serif;color:#55100c;padding-right:calc(19px * var(--k))}
.nota .pregunta{font-size:25px;line-height:1.15;color:#16120f}
.nota .donde{font-family:'Silkscreen',monospace;font-size:16px;text-transform:uppercase;letter-spacing:1px;color:#5a3a22;overflow-wrap:anywhere}
.nota .donde code{font:19px/1.1 'Handjet',monospace;text-transform:none;letter-spacing:0}
.nota .donde a,.nota .donde code{color:#55100c}
.nota .sello{position:absolute;top:-8px;right:-6px;transform:rotate(-8deg)}
/* el juego hoy */
.cifras{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,178px),1fr));gap:14px}
.cifras li{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:4px 2px 8px}
.cifras .n{font:51px/1 'Handjet',monospace;color:var(--gold-hi);text-shadow:2px 2px 0 var(--void)}
.cifras .t{color:var(--bone)}
.cifras .s{color:var(--dim);font:19px/1.15 'Handjet',monospace;text-transform:none;letter-spacing:0}
.armeria{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:16px 6px}
.armeria li{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;width:132px}
.armaduras{list-style:none;margin:26px 0 0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:16px 14px}
.armaduras li{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;width:170px}
.armaduras .n{color:var(--bone-hi)}
.armaduras .s{color:var(--dim);font:19px/1.15 'Handjet',monospace;text-transform:none;letter-spacing:0}
/* bestiario */
.jefes{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:16px}
.jefes>li{width:min(100%,266px)}
.jefe{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:2px 2px 8px;background-clip:padding-box}
.fig{display:flex;align-items:flex-end;justify-content:center;height:164px;margin-bottom:4px}
.jefes .fig{height:calc(162px * var(--k))}
.criaturas .fig{height:calc(82px * var(--k))}
.jefe h4{font:26px/1.1 'Bastarda',serif;color:var(--bone-hi);text-shadow:2px 2px 0 var(--void)}
.jefe .lugar{color:var(--gold)}
.nota-j{color:var(--ash)}
.desfile{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px 18px;margin:0 auto;max-width:1060px;background:radial-gradient(ellipse at 50% 100%,rgba(207,109,34,.22),rgba(6,5,5,0) 62%)}
.desfile .fila{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;background:linear-gradient(180deg,rgba(6,5,5,0) 82%,rgba(6,5,5,.55) 100%)}
.desfile img{margin:0 -7px 4px;filter:drop-shadow(0 4px 0 rgba(6,5,5,.75))}
.criaturas{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:14px 8px}
.criaturas li{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;width:calc(84px * var(--k) + 10px)}
.criaturas span{color:var(--ash);font-size:19px;line-height:1.1}
/* cómo */
.como p{color:var(--ash);max-width:76ch;margin:0 auto 12px}
.pie{text-align:center;color:var(--dim);padding:30px var(--gut) 40px;display:flex;flex-direction:column;align-items:center;gap:14px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;
}

// ---------------------------------------------------------------- README
// La sección «Hoja de ruta» del README, entre sus marcas.
export function seccionReadme({ D, C, imgs, nombres }) {
  const L = [];
  const P = C.global;
  L.push('<!-- hoja-de-ruta: la genera `node tools/hoja_de_ruta.mjs` desde tools/hoja_de_ruta/datos.mjs; no se toca a mano -->');
  L.push('## Hoja de ruta');
  L.push('');
  L.push(`<p align="center"><a href="docs/hoja-de-ruta/index.html"><img src="docs/hoja-de-ruta/${imgs.portada}" width="880" alt="Dawn of Braga · Hoja de ruta: ${pct(P.frac)} % hacia la 1.0"></a></p>`);
  L.push('');
  L.push(`**${pct(P.frac)} % hacia la 1.0**: ${fmt(P.hecho)} de ${P.total} tareas y ${C.fasesHechas} de las ${D.FASES.length} fases hechas (al día el ${D.FECHA}). Lo siguiente: **${C.siguiente.nombre.toLowerCase()}**, ${C.siguiente.lema.split(':')[0].toLowerCase()} (\`${C.siguiente.plan}\`).`);
  L.push('');
  L.push('La hoja de ruta entera, con el arte del propio juego (las fases con su vista y su gente, lo que viene, las expansiones, lo que hay que decidir, lo que tiene el juego hoy y el bestiario): [`docs/hoja-de-ruta/`](docs/hoja-de-ruta/index.html), una sola página que se abre en el navegador (y que se puede publicar con la carpeta `/docs` en GitHub Pages, junto a la versión jugable). Se genera desde [`tools/hoja_de_ruta/datos.mjs`](tools/hoja_de_ruta/datos.mjs) con `node tools/hoja_de_ruta.mjs`.');
  L.push('');
  L.push(`<p align="center"><img src="docs/hoja-de-ruta/${imgs.camino}" width="880" alt="El camino: las catorce fases de la 1.0 y lo que viene después"></p>`);
  L.push('');
  L.push('| | Fase | Estado | Progreso |');
  L.push('|---|---|---|---|');
  for (const f of D.FASES) {
    const p = progreso(f.tareas);
    L.push(`| ${f.num} | [${f.nombre}](docs/hoja-de-ruta/index.html#fase-${f.id}) | ${ESTADOS[estadoDe(f)]} | ${pct(p.frac)} % (${fmt(p.hecho)} de ${p.total}) |`);
  }
  L.push('');
  L.push('### Lo que viene');
  L.push('');
  const orden = ['siguiente', 'espera', 'curso', 'pendiente'];
  for (const f of D.FASES.filter((f) => estadoDe(f) !== 'hecha').sort((a, b) => orden.indexOf(estadoDe(a)) - orden.indexOf(estadoDe(b)))) {
    const p = progreso(f.tareas);
    L.push(`**${f.num} · ${f.nombre}** — ${f.lema}. *${ESTADOS[estadoDe(f)]}, ${pct(p.frac)} %*${f.plan ? ` · \`${f.plan}\`` : ''}`);
    L.push('');
    for (const [t, h, o] of f.tareas) L.push(`- [${h >= 1 ? 'x' : ' '}] ${t}${h > 0 && h < 1 ? ' *(a medias)*' : ''}${o && o.opcional ? ' *(opcional)*' : ''}`);
    L.push('');
  }
  L.push('### Más allá de la 1.0');
  L.push('');
  L.push(`<p align="center"><img src="docs/hoja-de-ruta/${imgs.mas}" width="880" alt="Más allá de la 1.0: el final secreto, los otros finales y Dawn of the Devil"></p>`);
  L.push('');
  for (const x of D.EXPANSIONES) {
    const p = x.tareas.length ? progreso(x.tareas) : null;
    L.push(`- **${x.num} · ${x.nombre}** (${ESTADOS[x.estado].toLowerCase()}${p ? `, ${pct(p.frac)} %` : ''}) — ${x.texto} · *${x.plan}*`);
  }
  L.push('');
  L.push('### Por decidir');
  L.push('');
  for (const d of D.DECISIONES) L.push(`- **${d.que}** — ${d.pregunta} ${d.mas} · *${d.donde}*`);
  L.push('');
  L.push(`<p align="center"><img src="docs/hoja-de-ruta/${imgs.bestiario}" width="880" alt="Los ${D.JEFES.length} jefes de Braga, fotografiados con sus modelos del juego"></p>`);
  L.push('');
  L.push(`<p align="center"><sub>Los ${D.JEFES.length} jefes de Braga, fotografiados con sus modelos del juego: ${D.JEFES.map((id) => nombres[id]).join(' · ')}.</sub></p>`);
  L.push('');
  L.push('<!-- /hoja-de-ruta -->');
  return L.join('\n');
}
