import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

const demoRoot = fileURLToPath(new URL('./demo', import.meta.url));
const libraryEntry = fileURLToPath(new URL('./src/index.ts', import.meta.url));

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      root: demoRoot,
      publicDir: false,
    };
  }

  return {
    build: {
      emptyOutDir: true,
      lib: {
        entry: libraryEntry,
        fileName: 'index',
        formats: ['es'],
      },
      outDir: 'dist',
      sourcemap: true,
      target: 'es2020',
    },
  };
});
