import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDemoLayout } from '../demo/demo-layout';

describe('demo layout', () => {
  it('creates the simple demo regions', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.querySelector<HTMLDivElement>('#app');

    if (!app) {
      throw new Error('Expected demo root.');
    }

    const layout = createDemoLayout(app);

    expect(layout.shell.parentElement).toBe(app);
    expect(layout.header.parentElement).toBe(layout.shell);
    expect(layout.graphMount.id).toBe('demo-graph');
    expect(layout.graphMount.parentElement).toBe(layout.shell);
    expect(layout.toolbar.parentElement).toBe(layout.shell);
    expect(layout.routeControls.parentElement).toBe(layout.toolbar);
    expect(layout.visualControls.parentElement).toBe(layout.toolbar);
  });

  it('keeps the graph mount responsive without a fixed minimum width', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.querySelector<HTMLDivElement>('#app');

    if (!app) {
      throw new Error('Expected demo root.');
    }

    const layout = createDemoLayout(app);

    expect(layout.graphMount.className).toContain('w-full');
    expect(layout.graphMount.className).not.toContain('min-w-[');
  });

  it('loads Tailwind through the browser CDN script', () => {
    const indexPath = join(process.cwd(), 'demo/index.html');
    const indexHtml = readFileSync(indexPath, 'utf8');

    expect(indexHtml).toContain(
      'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
    );
  });
});
