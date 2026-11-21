import { defineConfig } from 'vite';

// base './' permite publicar a pasta dist em qualquer lugar (itch.io, GitHub Pages...)
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
