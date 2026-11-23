import { defineConfig } from 'vite';

// Todas as imagens viram data URI dentro do JS, e depois scripts/inline.mjs
// junta tudo num único HTML (fácil de publicar em qualquer lugar).
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    modulePreload: false,
    cssCodeSplit: false,
  },
});
