import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph } from '../src/index';
import { createMockContext, stubCanvasContext } from './support/canvas';

describe('connections', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connects two committed nodes and returns a committed connection', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    const connection = graph.connect(source, target);

    expect(connection.id).toBeTypeOf('string');
    expect(connection.sourceNodeId).toBe(source.id);
    expect(connection.targetNodeId).toBe(target.id);
    expect(connection.style).toEqual({
      arrow: 'end',
      color: '#64748b',
      line: 'straight',
      stroke: 'solid',
    });
  });

  it('connects two committed node ids and returns a committed connection', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('source').done();
    const target = graph.createNode('target').id('target').done();

    const connection = graph.connect(source.id, target.id);

    expect(connection.sourceNodeId).toBe('source');
    expect(connection.targetNodeId).toBe('target');
  });

  it('resolves cloned node objects by stable id instead of exact reference', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('source').done();
    const target = graph.createNode('target').id('target').done();

    const connection = graph.connect({ ...source }, { ...target });

    expect(connection.sourceNodeId).toBe('source');
    expect(connection.targetNodeId).toBe('target');
  });

  it('resolves graph-level connection defaults onto committed connections', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      connection: {
        arrow: 'both',
        color: '#0f766e',
        line: 'bezier',
        stroke: 'dotted',
      },
    });
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    const connection = graph.connect(source, target);

    expect(connection.style).toEqual({
      arrow: 'both',
      color: '#0f766e',
      line: 'bezier',
      stroke: 'dotted',
    });
  });

  it('uses the graph theme connection color when no explicit connection color is provided', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      theme: {
        preset: 'forest',
      },
    });
    const source = graph.createNode('source').id('source').done();
    const target = graph.createNode('target').id('target').done();

    const connection = graph.connect(source, target);

    expect(connection.style.color).toBe('#15803d');
  });

  it('allows per-connection style overrides through connect options', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      connection: {
        arrow: 'end',
        color: '#64748b',
        line: 'straight',
        stroke: 'solid',
      },
    });
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    const connection = graph.connect(source, target, {
      style: {
        arrow: 'none',
        color: '#dc2626',
        line: 'bezier',
        stroke: 'animated-dotted',
      },
    });

    expect(connection.style).toEqual({
      arrow: 'none',
      color: '#dc2626',
      line: 'bezier',
      stroke: 'animated-dotted',
    });
  });

  it('stores a non-empty connection label from connect options', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    const connection = graph.connect(source, target, {
      label: ' cache hit ',
    });

    expect(connection.label).toBe('cache hit');
  });

  it('stores explicit source and target port ids from connect options', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph
      .createNode('source')
      .id('source')
      .port('out', { side: 'right' })
      .done();
    const target = graph
      .createNode('target')
      .id('target')
      .port('in', { side: 'left' })
      .done();

    const connection = graph.connect(source, target, {
      sourcePort: 'out',
      targetPort: 'in',
    });

    expect(connection.sourcePortId).toBe('out');
    expect(connection.targetPortId).toBe('in');
  });

  it('throws when a source port does not exist on the source node', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('source').done();
    const target = graph.createNode('target').id('target').done();

    expect(() => graph.connect(source, target, {
      sourcePort: 'missing',
    })).toThrowError('Source port "missing" does not exist on node "source".');
  });

  it('throws when a target port does not exist on the target node', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('source').done();
    const target = graph.createNode('target').id('target').done();

    expect(() => graph.connect(source, target, {
      targetPort: 'missing',
    })).toThrowError('Target port "missing" does not exist on node "target".');
  });

  it('does not store whitespace-only connection labels', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    const connection = graph.connect(source, target, {
      label: '   ',
    });

    expect(connection.label).toBeUndefined();
  });

  it('throws when committing duplicate explicit node ids', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph.createNode('source').id('shared-node').done();

    expect(() => graph.createNode('target').id('shared-node').done()).toThrowError(
      'Node id "shared-node" already exists in this graph.',
    );
  });

  it('resolves matching stable ids even when the node object comes from another graph', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const firstGraph = new CanvasGraph('app');
    const firstSource = firstGraph.createNode('source').id('shared-source').done();
    const firstTarget = firstGraph.createNode('target').id('shared-target').done();

    document.body.innerHTML = '<div id="other"></div>';
    stubCanvasContext(createMockContext());

    const secondGraph = new CanvasGraph('other');
    const secondSource = secondGraph.createNode('source').id('shared-source').done();
    const secondTarget = secondGraph.createNode('target').id('shared-target').done();

    const connection = firstGraph.connect(secondSource, secondTarget);

    expect(connection.sourceNodeId).toBe(firstSource.id);
    expect(connection.targetNodeId).toBe(firstTarget.id);
  });

  it('throws when the source node is not part of the graph', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = {
      color: '#6b7280',
      height: 60,
      id: 'node-999',
      kind: 'source',
      shape: 'rect' as const,
      title: 'Source',
      width: 120,
      x: 0,
      y: 0,
    };
    const target = graph.createNode('target').done();

    expect(() => graph.connect(source, target)).toThrowError(
      'Source node "node-999" is not part of this graph.',
    );
  });

  it('throws when the target node is not part of the graph', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = {
      color: '#6b7280',
      height: 60,
      id: 'node-999',
      kind: 'target',
      shape: 'rect' as const,
      title: 'Target',
      width: 120,
      x: 0,
      y: 0,
    };

    expect(() => graph.connect(source, target)).toThrowError(
      'Target node "node-999" is not part of this graph.',
    );
  });

  it('throws when attempting to connect a node to itself', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();

    expect(() => graph.connect(source, source)).toThrowError(
      'Self-connections are not supported yet.',
    );
  });
});
