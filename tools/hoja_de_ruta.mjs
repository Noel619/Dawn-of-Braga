// La hoja de ruta: docs/hoja-de-ruta/index.html (una sola página, con el arte
// del propio juego), sus imágenes para el README y la sección «Hoja de ruta»
// del README, todo desde tools/hoja_de_ruta/datos.mjs, que es lo único que se
// toca a mano.
//   node tools/hoja_de_ruta.mjs              (si no hay un Vite en el 5199, lo arranca)
//   node tools/hoja_de_ruta.mjs --retratos   (vuelve a fotografiar los modelos y las escenas)
// Lo que se fotografía del juego se guarda en tools/scratch/hoja_de_ruta/ y no
// se repite (unos tres minutos la primera vez: cada escena, con el juego recién
// cargado).
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
import * as D from './hoja_de_ruta/datos.mjs';
import { retratos, escenas, LAUNCH } from './hoja_de_ruta/modelos.mjs';
import { pagina, seccionReadme, progreso, estadoDe, necesidades } from './hoja_de_ruta/pagina.mjs';

const OUT = 'docs/hoja-de-ruta';
const forzar = process.argv.includes('--retratos');
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- Vite
let vite = null;
async function asegurarVite() {
  try {
    const r = await fetch('http://localhost:5199/tools/hoja_de_ruta/arte.html');
    if (r.ok) return;
  } catch (e) {}
  const { createServer } = await import('vite');
  vite = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
  await vite.listen();
  log('(Vite, en el 5199)');
}

// ---------------------------------------------------------------- cifras
// Lo que se cuenta del repositorio (lo demás, de los módulos del juego: arte.js).
function cifrasRepo() {
  const js = execSync("git ls-files 'src/*.js' 'src/**/*.js'").toString().trim().split('\n').filter(Boolean);
  const lineas = js.reduce((a, f) => a + fs.readFileSync(f, 'utf8').split('\n').length - 1, 0);
  // (las de prueba y medida: no cuenta esta)
  const herramientas = execSync("git ls-files 'tools/*.mjs'").toString().trim().split('\n').filter((f) => f && f !== 'tools/hoja_de_ruta.mjs').length;
  // los temas de la música (core/audio_music.js, THEMES)
  const mus = fs.readFileSync('src/core/audio_music.js', 'utf8');
  const i0 = mus.indexOf('const THEMES = {');
  const bloque = mus.slice(i0, mus.indexOf('\n};', i0));
  const temas = (bloque.match(/^ {2}[a-zA-Z_0-9]+: \{/gm) || []).length;
  return { lineas, archivos: js.length, herramientas, temas };
}

function global() {
  let hecho = 0,
    total = 0;
  for (const f of D.FASES) {
    const p = progreso(f.tareas);
    hecho += p.hecho;
    total += p.total;
  }
  return { hecho, total, frac: total ? hecho / total : 0 };
}

// ---------------------------------------------------------------- README
function actualizarReadme(seccion) {
  const R = fs.readFileSync('README.md', 'utf8');
  let a = R.indexOf('<!-- hoja-de-ruta');
  if (a < 0) a = R.indexOf('## Hoja de ruta');
  let b = R.indexOf('<!-- /hoja-de-ruta -->');
  if (b >= 0) b += '<!-- /hoja-de-ruta -->'.length;
  else b = R.indexOf('## Qué hay dentro');
  if (a < 0 || b < 0 || b < a) throw new Error('README.md: no encuentro dónde va la hoja de ruta');
  const despues = R.slice(b).replace(/^\s*/, '');
  fs.writeFileSync('README.md', R.slice(0, a) + seccion + '\n\n' + despues);
}

// ---------------------------------------------------------------- todo
await asegurarVite();
const browser = await chromium.launch(LAUNCH);
try {
  const g = global();
  const fasesHechas = D.FASES.filter((f) => estadoDe(f) === 'hecha').length;
  const siguiente = D.FASES.find((f) => estadoDe(f) === 'siguiente') || D.FASES.find((f) => estadoDe(f) !== 'hecha');

  // 1. el arte de la interfaz y lo que hay en el juego
  log('El arte de la interfaz…');
  const pa = await browser.newPage();
  const errs = [];
  pa.on('pageerror', (e) => errs.push(e.message));
  await pa.goto('http://localhost:5199/tools/hoja_de_ruta/arte.html');
  await pa.waitForFunction(() => window.__listo, null, { timeout: 120000 });
  const contenido = (await pa.evaluate(() => window.__dibujar({}))).contenido;
  const C = { global: g, fasesHechas, siguiente, contenido, ...cifrasRepo() };
  const PERSONAS = new Set(['henrique', 'paio', 'rey', 'morador', 'desfigurado']);
  C.criaturas = new Set(contenido.tipos.filter((t) => !t.jefe && !PERSONAS.has(t.id)).map((t) => t.nombre)).size;
  const A = await pa.evaluate((pide) => window.__dibujar(pide), necesidades(D, C));

  // 2. lo que sale del juego en 3D
  log('Los modelos y las escenas del juego…');
  const usados = new Set([...D.FASES.flatMap((f) => f.sprites), ...D.CRIATURAS]);
  // (recortados a su silueta: se alinean por los pies y caben juntos)
  const modelos = await pa.evaluate((m) => window.__recortar(m), await retratos(browser, D.MODELOS, { forzar, log }));
  const mini = await pa.evaluate((m) => window.__recortar(m), await retratos(browser, Object.fromEntries([...usados].map((k) => [k, D.MODELOS[k]])), { forzar, log, arte: 80 }));
  await pa.close();
  if (errs.length) log('  (errores: ' + errs.join(' | ') + ')');
  const esc = await escenas(browser, D.ESCENAS, { forzar, log });
  const nombres = {};
  for (const [k, m] of Object.entries(D.MODELOS)) {
    const t = m.tipo && contenido.tipos.find((x) => x.id === m.tipo);
    nombres[k] = m.nombre || (t && t.nombre) || k;
  }
  const icono = { url: 'data:image/png;base64,' + fs.readFileSync('public/icon-192.png').toString('base64'), w: 96, h: 96 };
  const S = { modelos, mini, escenas: esc, icono, nombres };

  // 3. la página
  const b64 = (f) => fs.readFileSync('src/fonts/' + f).toString('base64');
  const F = { bastarda: b64('jacquarda-bastarda-9.woff2'), handjet: b64('handjet.woff2'), silkscreen: b64('silkscreen.woff2') };
  const html = pagina({ D, A, S, C, F });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/index.html`, html);
  log(`${OUT}/index.html (${Math.round(html.length / 1024)} KB)`);

  // 4. las imágenes del README: trozos de la página, a 880 de ancho (el del
  // README en GitHub) y al doble de píxeles (nítidas en las pantallas densas)
  const pp = await browser.newPage({ viewport: { width: 880, height: 1000 }, deviceScaleFactor: 2 });
  await pp.goto('file://' + process.cwd() + `/${OUT}/index.html`);
  await pp.evaluate(() => document.fonts.ready);
  await pp.evaluate(() => Promise.all([...document.images].map((i) => (i.loading = 'eager', i.decode().catch(() => {})))));
  await pp.addStyleTag({ content: '.indice{position:static}' });
  const imgs = { portada: 'portada.png', camino: 'camino.png', mas: 'mas.png', bestiario: 'jefes.png' };
  const sel = { portada: 'header.portada', camino: '#camino', mas: '#mas', bestiario: '#bestiario .desfile' };
  for (const [k, f] of Object.entries(imgs)) {
    await pp.locator(sel[k]).first().screenshot({ path: `${OUT}/${f}` });
    log(`${OUT}/${f}`);
  }
  await pp.close();

  // 5. el README
  actualizarReadme(seccionReadme({ D, C, imgs, nombres }));
  log('README.md: la sección «Hoja de ruta», al día');
  log(`\n${Math.round(g.frac * 100)} % hacia la 1.0 (${g.hecho} de ${g.total} tareas; ${fasesHechas} de ${D.FASES.length} fases hechas)`);
} finally {
  await browser.close();
  if (vite) await vite.close();
}
