import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build único: todo (código + three.js) queda embebido en dist/index.html,
// que puede abrirse directamente en el navegador sin servidor.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
  },
  server: { host: true },
});
