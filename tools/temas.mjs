// Los temas de la música, grabados: cada uno, con el motor de música del juego
// (core/audio_music.js) y su misma cadena (el compresor y la sala de la
// música), sin tiempo real (OfflineAudioContext), a un .wav; y, si hay ffmpeg,
// también a .mp3. Para escucharlos sin jugar, y para ver su forma: la fuerza
// de cada segundo.
//   node tools/temas.mjs <tema>[:segundos],... [carpeta]
//   p. ej.: node tools/temas.mjs bossFisico:40,bossFisico2:30,fisicoMuerte:32 tools/scratch/temas
//   (levanta su propio Vite si no hay uno en el 5199)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const pedidos = (process.argv[2] || 'bossFisico:40').split(',').map((s) => {
  const [name, secs] = s.split(':');
  return { name, secs: +(secs || 30) };
});
const dir = process.argv[3] || 'tools/scratch/temas';
fs.mkdirSync(dir, { recursive: true });
const PORT = 5199;
let vite = null;
try {
  await fetch('http://localhost:' + PORT + '/');
} catch {
  const { createServer } = await import('vite');
  vite = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' });
  await vite.listen();
}
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const errores = [];
p.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message));
p.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errores.push('console.error: ' + m.text()));
await p.goto('http://localhost:' + PORT + '/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
for (const { name, secs } of pedidos) {
  const r = await p.evaluate(
    async ([name, secs]) => {
      const A = window.__game.audio;
      if (!A.ctx) A.init();
      const lib = A.lib;
      const sr = 44100;
      const off = new OfflineAudioContext(2, Math.ceil(sr * secs), sr);
      // (la cadena de la música: core/audio.js)
      const comp = off.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.02;
      comp.release.value = 0.4;
      comp.connect(off.destination);
      const musIn = off.createGain();
      musIn.gain.value = 0.85;
      musIn.connect(comp);
      const send = off.createGain();
      const hp = off.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 200;
      const conv = off.createConvolver();
      conv.buffer = lib.ir('hall');
      const ret = off.createGain();
      ret.gain.value = 0.55;
      send.connect(hp).connect(conv).connect(ret).connect(off.destination);
      const M = new A.score.constructor(off, lib, musIn, send);
      M.setTheme(name, 0.05);
      if (!M.cur) return { error: 'no existe el tema ' + name };
      // (toda la partitura de una vez)
      M.lookahead = secs;
      M.update();
      const buf = await off.startRendering();
      // la fuerza de cada segundo (dB) y el pico
      const L = buf.getChannelData(0),
        R = buf.getChannelData(1);
      const db = [];
      let pico = 0;
      for (let s = 0; s < Math.floor(secs); s++) {
        let acc = 0;
        for (let i = s * sr; i < (s + 1) * sr; i++) {
          const v = (L[i] + R[i]) * 0.5;
          acc += v * v;
          pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
        }
        db.push(Math.round(10 * Math.log10(acc / sr + 1e-12)));
      }
      // a .wav (16 bits, estéreo)
      const n = buf.length;
      const out = new DataView(new ArrayBuffer(44 + n * 4));
      const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF');
      out.setUint32(4, 36 + n * 4, true);
      w(8, 'WAVEfmt ');
      out.setUint32(16, 16, true);
      out.setUint16(20, 1, true);
      out.setUint16(22, 2, true);
      out.setUint32(24, sr, true);
      out.setUint32(28, sr * 4, true);
      out.setUint16(32, 4, true);
      out.setUint16(34, 16, true);
      w(36, 'data');
      out.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) {
        out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
        out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
      }
      const bytes = new Uint8Array(out.buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return { db, pico: +pico.toFixed(3), wav: btoa(bin) };
    },
    [name, secs]
  );
  if (r.error) {
    console.log(name, r.error);
    continue;
  }
  const f = path.join(dir, name + '.wav');
  fs.writeFileSync(f, Buffer.from(r.wav, 'base64'));
  let mp3 = null;
  try {
    mp3 = f.replace(/\.wav$/, '.mp3');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-codec:a', 'libmp3lame', '-qscale:a', '3', mp3]);
  } catch {
    mp3 = null;
  }
  console.log(name.padEnd(14), 'pico', r.pico, '| dB por segundo:', r.db.join(' '));
  console.log(''.padEnd(14), f + (mp3 ? ' · ' + mp3 : ''));
}
console.log(errores.length ? errores.slice(0, 8).join('\n') : 'sin errores');
await b.close();
if (vite) await vite.close();
