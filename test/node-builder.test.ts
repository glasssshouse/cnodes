import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph } from '../src/index';
import { createMockContext, stubCanvasContext } from './support/canvas';

describe('node builder', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    stubCanvasContext(createMockContext());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('commits a node with generated id and default values', () => {
    const graph = new CanvasGraph('app');

    const node = graph.createNode('source').done();

    expect(node.id).toBeTypeOf('string');
    expect(node.id).not.toBe('source');
    expect(node.kind).toBe('source');
    expect(node.color).toBe('#6b7280');
    expect(node.x).toBe(0);
    expect(node.y).toBe(0);
    expect(node.shape).toBe('rect');
    expect(node.title).toBe('source');
    expect(node.width).toBe(120);
    expect(node.height).toBe(60);
    expect(node.description).toBeUndefined();
  });

  it('uses the graph theme fill when no explicit node color is provided', () => {
    const graph = new CanvasGraph('app', {
      theme: {
        preset: 'forest',
      },
    });

    const node = graph.createNode('source').done();

    expect(node.color).toBe('#166534');
  });

  it('keeps explicit node color over the graph theme fill', () => {
    const graph = new CanvasGraph('app', {
      theme: {
        preset: 'forest',
      },
    });

    const node = graph.createNode('source').color('#4f46e5').done();

    expect(node.color).toBe('#4f46e5');
  });

  it('uses circle defaults when the shape is circle', () => {
    const graph = new CanvasGraph('app');

    const node = graph.createNode('source').shape('circle').done();

    expect(node.shape).toBe('circle');
    expect(node.width).toBe(48);
    expect(node.height).toBe(48);
  });

  it('applies fluent overrides before commit', () => {
    const graph = new CanvasGraph('app');

    const node = graph
      .createNode('source')
      .title('Source')
      .description('Source node')
      .color('#4f46e5')
      .at(100, 120)
      .shape('circle')
      .size(160, 90)
      .done();

    expect(node.kind).toBe('source');
    expect(node.title).toBe('Source');
    expect(node.description).toBe('Source node');
    expect(node.color).toBe('#4f46e5');
    expect(node.x).toBe(100);
    expect(node.y).toBe(120);
    expect(node.shape).toBe('circle');
    expect(node.width).toBe(160);
    expect(node.height).toBe(90);
  });

  it('commits an explicit stable id when provided', () => {
    const graph = new CanvasGraph('app');

    const node = graph
      .createNode('source')
      .id('source-node')
      .done();

    expect(node.id).toBe('source-node');
  });

  it('grows node height when wrapped title text needs more vertical space', () => {
    const graph = new CanvasGraph('app');

    const node = graph
      .createNode('source')
      .title('Source Node')
      .size(80, 60)
      .done();

    expect(node.width).toBe(80);
    expect(node.height).toBe(64);
  });
});
