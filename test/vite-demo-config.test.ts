import { describe, expect, it } from 'vitest';

import { createDemoViteConfig, demoRoot } from '../vite.demo.config';

describe('vite demo config', () => {
  it('builds the demo for relative static hosting', () => {
    const config = createDemoViteConfig();

    expect(config.root).toBe(demoRoot);
    expect(config.base).toBe('./');
    expect(config.publicDir).toBe(false);
    expect(config.build).toMatchObject({
      emptyOutDir: true,
      outDir: '../dist-demo',
      target: 'es2020',
    });
  });
});
