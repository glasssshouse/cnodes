import { resolve } from 'node:path';

import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';

export const demoRoot = resolve(process.cwd(), 'demo');

export function createDemoViteConfig(): UserConfig {
  return {
    base: './',
    build: {
      emptyOutDir: true,
      outDir: '../dist-demo',
      target: 'es2020',
    },
    publicDir: false,
    root: demoRoot,
  };
}

export default defineConfig(createDemoViteConfig());
