// Los huecos de una sala (PLAN_REFUGIOS.md, §2 y §8): ¿está cerrada? Recorre el
// borde de cada rectángulo de la zona, en cada planta que tenga, y dispara de
// dentro afuera a la altura de la rodilla, del pecho y de los ojos:
//   paso      se pasa (una puerta abierta, un arco, un boquete)
//   vano      se pasa, pero al otro lado no hay suelo (una ventana hasta el
//             suelo, un balcón sin balcón, lo alto de una torre)
//   ventana   no se pasa, pero se ve (una ventana, una reja, un antepecho)
// Junta lo seguido en huecos con su ancho y dice qué hay al otro lado (otra
// zona, la calle o nada). Las plantas son las alturas de suelo que cubren al
// menos la sexta parte de la sala (no lo alto de un muro ni la losa de debajo).
// Las puertas con hoja (kind 'door') que hay en el borde, aparte: cerradas
// tapan; abiertas, son un paso. Lo de una planta a otra (escaleras,
// trampillas) y los tejados (muchos no tienen colisión), no: eso, a mano.
//   node tools/huecos.mjs                       (las candidatas a refugio)
//   node tools/huecos.mjs taberna,viuda         (las zonas que se digan)
//   node tools/huecos.mjs --json ...            (todo, en JSON)
//   (requiere npx vite --port 5199; mide la partida recién empezada: las puertas, como están al principio)
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const pedidas = args.filter((a) => !a.startsWith('--')).join(',').split(',').filter(Boolean);
// las salas que el plan propone como refugio, las que podrían serlo y los altares de ahora
const CANDIDATAS = [
  // castillo
  'torre_carcel', 'torre_carcel_alta', 'cuartel', 'castle_chapel',
  // ciudad
  'taberna', 'oratorio', 'panaderia', 'tejedor', 'souto_house', 'souto_alta', 'tonelero', 'tonelero_alta', 'tintoreria', 'chapel', 'canon', 'establo', 'carpinteria', 'smithy',
  // barrio y Postigo
  'viuda', 'zapatero', 'cordeleria', 'quemada', 'casa_aleman', 'sobrado_aleman',
  // bajo la Sé
  'crypt', 'sacristia', 'capilla_sisnando', 'capilla_martin', 'lucernario',
  // fortaleza
  'capilla_real', 'cancilleria', 'tombo_registros', 'tombo_legajos', 'tombo_cartas', 'tombo_arcas', 'coracha_torre', 'oratorio_rey', 'reina_torre', 'reina_oratorio', 'reina_camara', 'despensa', 'tesoro', 'carcel_carceleros',
  // cloacas y lo hondo
  'vergel', 'lobera_osario',
];
const ZONAS = pedidas.length ? pedidas : CANDIDATAS;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const out = await p.evaluate((ZONAS) => {
  window.__pause = true;
  const g = __game;
  const col = g.world.col;
  const PASO = (b) => !b.camOnly;
  const libre = (ax, ay, az, bx, by, bz, f) => {
    const dx = bx - ax,
      dy = by - ay,
      dz = bz - az;
    const d = Math.hypot(dx, dy, dz);
    return col.raycast(ax, ay, az, dx / d, dy / d, dz / d, d, f) === Infinity;
  };
  const dentro = (z, x, y, zz) => z.rects.some((r) => x >= r[0] && x <= r[2] && zz >= r[1] && zz <= r[3] && y >= r[4] && y <= r[5]);
  // los suelos bajo (x, z) entre y0 e y1, de arriba abajo: donde cabe alguien
  // de pie (no la cara de arriba de un forjado bajo el tejado, ni la losa de
  // debajo del suelo)
  const suelos = (x, z, y0, y1) => {
    const s = [];
    let top = y1 - 0.1;
    for (let k = 0; k < 6; k++) {
      const gy = col.groundHeight(x, z, 0.15, top);
      if (gy < y0 - 0.3) break;
      if (gy + 1.9 <= y1 + 0.3 && libre(x, gy + 0.2, z, x, gy + 1.9, z, PASO)) s.push(gy);
      top = gy - 0.5;
    }
    return s;
  };
  const nombre = (q) => {
    const zn = g.zoneAt(q);
    return zn ? zn.id + (zn.room ? '' : ' (fuera)') : 'nada';
  };
  const res = [];
  for (const id of ZONAS) {
    const zonas = g.level.L.zones.filter((z) => z.id === id);
    if (!zonas.length) {
      res.push({ id, falta: true });
      continue;
    }
    for (const z of zonas) {
      const huecos = [];
      // las plantas de la sala: las alturas de suelo de una rejilla de su
      // interior, las que cubren al menos la sexta parte
      const cuenta = new Map();
      let total = 0;
      for (const r of z.rects)
        for (let x = r[0] + 0.6; x < r[2] - 0.3; x += 1.2)
          for (let zz = r[1] + 0.6; zz < r[3] - 0.3; zz += 1.2)
            for (const gy of suelos(x, zz, r[4], r[5])) {
              const k = Math.round(gy * 4) / 4;
              cuenta.set(k, (cuenta.get(k) || 0) + 1);
              total++;
            }
      // (de arriba abajo; una planta, al menos 1,8 m por encima de la de debajo:
      // lo que queda más cerca es la losa del suelo, no otra planta)
      const plantas = [];
      for (const k of [...cuenta].filter(([, n]) => n >= total / 6).map(([k]) => k).sort((a, b) => b - a)) if (!plantas.length || plantas[plantas.length - 1] - k >= 1.8) plantas.push(k);
      const planta = (gy) => plantas.find((k) => Math.abs(k - gy) <= 0.35);
      for (const r of z.rects) {
        const lados = [
          { n: 'N', a: [r[0], r[1]], b: [r[2], r[1]], v: [0, -1] },
          { n: 'S', a: [r[0], r[3]], b: [r[2], r[3]], v: [0, 1] },
          { n: 'O', a: [r[0], r[1]], b: [r[0], r[3]], v: [-1, 0] },
          { n: 'E', a: [r[2], r[1]], b: [r[2], r[3]], v: [1, 0] },
        ];
        for (const L of lados) {
          const len = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1]);
          const runs = new Map(); // planta -> [{t0, t1, tipo, otro}]
          for (let t = 0.2; t <= len - 0.2; t += 0.25) {
            const ex = L.a[0] + ((L.b[0] - L.a[0]) * t) / len,
              ez = L.a[1] + ((L.b[1] - L.a[1]) * t) / len;
            const ix = ex - L.v[0] * 1.0,
              iz = ez - L.v[1] * 1.0;
            const ox = ex + L.v[0] * 1.5,
              oz = ez + L.v[1] * 1.5;
            for (const gy of suelos(ix, iz, r[4], r[5])) {
              if (planta(gy) === undefined) continue;
              // (lo de fuera que sigue siendo esta zona: una costura entre rectángulos)
              if (dentro(z, ox, gy + 1, oz)) continue;
              const pasa = libre(ix, gy + 0.45, iz, ox, gy + 0.45, oz, PASO) && libre(ix, gy + 1.2, iz, ox, gy + 1.2, oz, PASO);
              const ve = col.lineOfSight(ix, gy + 1.6, iz, ox, gy + 1.6, oz) || col.lineOfSight(ix, gy + 1.2, iz, ox, gy + 1.2, oz);
              // (se pasa, pero al otro lado no hay suelo: un vano sobre el vacío)
              const suelo = pasa && col.groundHeight(ox, oz, 0.15, gy + 0.6) >= gy - 1.2;
              const tipo = pasa ? (suelo ? 'paso' : 'vano') : ve ? 'ventana' : null;
              const k = planta(gy).toFixed(1);
              if (!runs.has(k)) runs.set(k, []);
              const lista = runs.get(k);
              const last = lista[lista.length - 1];
              if (tipo && last && last.tipo === tipo && t - last.t1 <= 0.55) last.t1 = t;
              else if (tipo) lista.push({ t0: t, t1: t, tipo, otro: nombre({ x: ox, y: gy + 1, z: oz }), x: ex, z: ez });
            }
          }
          for (const [k, lista] of runs)
            for (const h of lista) {
              const ancho = h.t1 - h.t0 + 0.25;
              if (ancho < 0.5) continue;
              huecos.push({ lado: L.n, suelo: +k, ancho: +ancho.toFixed(1), tipo: h.tipo, otro: h.otro, en: [+h.x.toFixed(1), +h.z.toFixed(1)] });
            }
        }
      }
      // las puertas con hoja que hay en su borde
      const puertas = g.interact.list
        .filter((it) => it.kind === 'door' && z.rects.some((r) => it.x >= r[0] - 1.2 && it.x <= r[2] + 1.2 && it.z >= r[1] - 1.2 && it.z <= r[3] + 1.2 && (it.y ?? 0) >= r[4] - 1 && (it.y ?? 0) <= r[5] + 1))
        .map((it) => ({ id: it.id, lock: it.lock ? it.lock.type : 'none', abierta: !!it.done }));
      res.push({ id, room: z.room || null, plantas, huecos, puertas });
    }
  }
  return res;
}, ZONAS);

if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
else
  for (const z of out) {
    if (z.falta) {
      console.log(`\n${z.id}: no existe esa zona`);
      continue;
    }
    const n = (t) => z.huecos.filter((h) => h.tipo === t).length;
    console.log(`\n${z.id}${z.room ? '' : ' (exterior)'} · plantas ${z.plantas.join(' / ')} · ${n('paso')} pasos, ${n('vano')} vanos, ${n('ventana')} ventanas, ${z.puertas.length} puertas con hoja`);
    for (const h of z.huecos) console.log(`    ${h.tipo.padEnd(7)} ${h.lado} ${String(h.ancho).padStart(4)} m  suelo ${String(h.suelo).padStart(5)}  en ${h.en.join(', ')}  → ${h.otro}`);
    for (const d of z.puertas) console.log(`    puerta  ${d.id} (${d.lock}${d.abierta ? ', abierta' : ''})`);
  }
if (logs.length) console.log(logs.join('\n'));
await b.close();
