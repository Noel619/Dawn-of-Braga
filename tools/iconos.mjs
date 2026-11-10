// Los iconos de la web instalable (public/): la gran espada de la portada
// sobre el estandarte carmesí, con el resplandor de las brasas, dibujados con
// el mismo pixel art de la interfaz (ui/pixel.js), sin ningún archivo de
// imagen de fuera. icon-180.png (el de iOS), icon-192.png e icon-512.png (los
// del manifiesto) e icon-mask-512.png (el de Android, con margen para que lo
// recorte en círculo o en lo que quiera).
//   node tools/iconos.mjs            (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import fs from 'fs';

const PAGE = 'tools/scratch/iconos.html';
fs.mkdirSync('tools/scratch', { recursive: true });
fs.writeFileSync(
  PAGE,
  `<!doctype html><meta charset="utf-8"><script type="module">
import { greatSword, bannerBitmap, Bitmap, PAL, C, bayer } from '/src/ui/pixel.js';
// art: píxeles de arte por lado; k: cuántos píxeles de pantalla cada uno;
// pad: lo que se deja libre alrededor (el de Android)
function icono(art, k, pad = 0) {
  const b = new Bitmap(art, art);
  // fondo: la noche, y el resplandor rojo de los incendios desde abajo
  const glow = [C(PAL.void), C(PAL.blood0), C(PAL.blood1), C(PAL.ember0)];
  for (let y = 0; y < art; y++)
    for (let x = 0; x < art; x++) {
      const dx = (x + 0.5) / art - 0.5, dy = (y + 0.5) / art - 0.78;
      const t = Math.max(0, 1 - Math.hypot(dx * 1.25, dy * 1.05) / 0.62);
      const v = t * t * 2.6 + bayer(x, y) - 0.5;
      b.set(x, y, glow[Math.max(0, Math.min(3, Math.floor(v)))]);
    }
  const inner = art - 2 * pad;
  const sw = greatSword(Math.round(inner * 0.9));
  const ban = bannerBitmap(Math.round(inner * 0.84), Math.max(9, Math.round(inner * 0.15)), 'ember');
  const cx = Math.floor(art / 2);
  const top = pad + Math.round((inner - sw.h) / 2);
  b.blit(ban, cx - Math.floor(ban.w / 2), top + Math.round(sw.h * 0.47));
  b.blit(sw, cx - Math.floor(sw.w / 2), top);
  const c = document.createElement('canvas');
  c.width = c.height = art * k;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(b.canvas(), 0, 0, art * k, art * k);
  return c.toDataURL('image/png');
}
window.__iconos = {
  'icon-180.png': icono(90, 2),
  'icon-192.png': icono(96, 2),
  'icon-512.png': icono(128, 4),
  'icon-mask-512.png': icono(128, 4, 14),
};
</script>`
);
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5199/' + PAGE);
await p.waitForFunction(() => window.__iconos, null, { timeout: 60000 });
const icons = await p.evaluate(() => window.__iconos);
fs.mkdirSync('public', { recursive: true });
for (const [name, url] of Object.entries(icons)) {
  fs.writeFileSync('public/' + name, Buffer.from(url.split(',')[1], 'base64'));
  console.log('public/' + name);
}
if (errs.length) console.log(errs.join('\n'));
await b.close();
