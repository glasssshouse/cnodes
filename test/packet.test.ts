import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph } from '../src/index';
import { stubAnimationFrame } from './support/animation';
import { createMockContext, stubCanvasContext } from './support/canvas';

describe('packets', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a running packet when a direct connection exists', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    graph.connect(source, target);

    const packet = graph.send(source, target);

    expect(packet.id).toBeTypeOf('string');
    expect(packet.sourceNodeId).toBe(source.id);
    expect(packet.targetNodeId).toBe(target.id);
    expect(packet.progress).toBe(0);
    expect(packet.status).toBe('running');
    expect(animation.pending()).toBe(1);
  });

  it('creates a running packet when source and target are provided as node ids', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('source').done();
    const target = graph.createNode('target').id('target').done();

    graph.connect(source.id, target.id);

    const packet = graph.send(source.id, target.id);

    expect(packet.sourceNodeId).toBe('source');
    expect(packet.targetNodeId).toBe('target');
    expect(animation.pending()).toBe(1);
  });

  it('creates a running packet when a shortest multi-hop path exists', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const middle = graph.createNode('middle').done();
    const target = graph.createNode('target').done();

    graph.connect(source, middle);
    graph.connect(middle, target);

    const packet = graph.send(source, target);

    expect(packet.sourceNodeId).toBe(source.id);
    expect(packet.targetNodeId).toBe(target.id);
    expect(packet.progress).toBe(0);
    expect(packet.status).toBe('running');
    expect(animation.pending()).toBe(1);
  });

  it('throws when the source node is not part of the graph', () => {
    const context = createMockContext();
    stubAnimationFrame();
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

    expect(() => graph.send(source, target)).toThrowError(
      'Source node "node-999" is not part of this graph.',
    );
  });

  it('throws when the target node is not part of the graph', () => {
    const context = createMockContext();
    stubAnimationFrame();
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

    expect(() => graph.send(source, target)).toThrowError(
      'Target node "node-999" is not part of this graph.',
    );
  });

  it('throws when no path exists', () => {
    const context = createMockContext();
    stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    expect(() => graph.send(source, target)).toThrowError(
      `No path exists from "${source.id}" to "${target.id}".`,
    );
  });

  it('keeps forward-only connections unavailable for reverse packet travel', () => {
    const context = createMockContext();
    stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    graph.connect(source, target);

    expect(() => graph.send(target, source)).toThrowError(
      `No path exists from "${target.id}" to "${source.id}".`,
    );
  });

  it('sends packets in reverse over a bidirectional connection', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    graph.connect(source, target, {
      travel: 'both',
    });

    const packet = graph.send(target, source);

    expect(packet.sourceNodeId).toBe(target.id);
    expect(packet.targetNodeId).toBe(source.id);
    expect(packet.progress).toBe(0);
    expect(packet.status).toBe('running');
    expect(animation.pending()).toBe(1);
  });

  it('routes through waypoints with reversed bidirectional segments', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('source').at(100, 120).done();
    const middle = graph.createNode('middle').id('middle').at(280, 120).done();
    const target = graph.createNode('target').id('target').at(460, 120).done();

    graph.connect(middle, source, {
      travel: 'both',
    });
    graph.connect(target, middle, {
      travel: 'both',
    });

    const packet = graph.send(source, target, {
      via: [middle],
    });

    vi.clearAllMocks();
    animation.step(900);

    expect(packet.sourceNodeId).toBe('source');
    expect(packet.targetNodeId).toBe('target');
    expect(packet.progress).toBeCloseTo(0.5);
  });

  it('resolves matching stable ids even when packet endpoints come from another graph', () => {
    const context = createMockContext();
    stubAnimationFrame();
    stubCanvasContext(context);

    const firstGraph = new CanvasGraph('app');
    const firstSource = firstGraph
      .createNode('source')
      .id('shared-source')
      .done();
    const firstTarget = firstGraph
      .createNode('target')
      .id('shared-target')
      .done();
    firstGraph.connect(firstSource, firstTarget);

    document.body.innerHTML = '<div id="other"></div>';
    stubCanvasContext(createMockContext());

    const secondGraph = new CanvasGraph('other');
    const secondSource = secondGraph
      .createNode('source')
      .id('shared-source')
      .done();
    const secondTarget = secondGraph
      .createNode('target')
      .id('shared-target')
      .done();

    const packet = firstGraph.send(secondSource, secondTarget);

    expect(packet.sourceNodeId).toBe(firstSource.id);
    expect(packet.targetNodeId).toBe(firstTarget.id);
  });

  it('prefers the shortest directed path when multiple routes exist', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const shortMiddle = graph.createNode('short').at(220, 120).done();
    const longMiddleA = graph.createNode('long-a').at(180, 220).done();
    const longMiddleB = graph.createNode('long-b').at(280, 220).done();
    const target = graph.createNode('target').at(340, 120).done();

    graph.connect(source, shortMiddle);
    graph.connect(shortMiddle, target);
    graph.connect(source, longMiddleA);
    graph.connect(longMiddleA, longMiddleB);
    graph.connect(longMiddleB, target);

    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(900);

    expect(context.arc).toHaveBeenNthCalledWith(1, 220, 120, 6, 0, Math.PI * 2);
  });

  it('routes through required waypoint nodes even when a shorter route exists', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('ingress').at(100, 120).done();
    const cache = graph.createNode('cache').id('cache').at(220, 120).done();
    const worker = graph
      .createNode('worker')
      .id('cache-worker')
      .at(340, 120)
      .done();
    const target = graph.createNode('target').id('end').at(460, 120).done();

    graph.connect(source, target);
    graph.connect(source, cache);
    graph.connect(cache, worker);
    graph.connect(worker, target);

    const packet = graph.send(source, target, {
      via: [cache, worker],
    });

    vi.clearAllMocks();
    animation.step(900);

    expect(packet.sourceNodeId).toBe('ingress');
    expect(packet.targetNodeId).toBe('end');
    expect(packet.progress).toBeCloseTo(1 / 3);
  });

  it('uses per-send packet styling over graph defaults', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      packet: {
        radius: 4,
        trail: false,
        trailLength: 8,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    graph.connect(source, target);
    graph.send(source, target, {
      packet: {
        color: '#22c55e',
        radius: 11,
        trail: true,
        trailColor: 'rgba(34, 197, 94, 0.35)',
        trailLength: 18,
      },
    });

    vi.clearAllMocks();
    context.fillRecords.length = 0;
    context.strokeRecords.length = 0;
    animation.step(450);

    expect(vi.mocked(context.arc).mock.calls).toContainEqual([
      expect.any(Number),
      expect.any(Number),
      11,
      0,
      Math.PI * 2,
    ]);
    expect(context.fillRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fillStyle: '#22c55e' }),
      ]),
    );
    expect(context.strokeRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineWidth: 11,
          strokeStyle: 'rgba(34, 197, 94, 0.35)',
        }),
      ]),
    );
  });

  it('throws when a required waypoint node is not part of the graph', () => {
    const context = createMockContext();
    stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('ingress').done();
    const target = graph.createNode('target').id('end').done();

    graph.connect(source, target);

    expect(() => graph.send(source, target, { via: ['missing'] })).toThrowError(
      'Waypoint node "missing" is not part of this graph.',
    );
  });

  it('throws when a required route segment has no path', () => {
    const context = createMockContext();
    stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('ingress').done();
    const cache = graph.createNode('cache').id('cache').done();
    const target = graph.createNode('target').id('end').done();

    graph.connect(source, cache);

    expect(() => graph.send(source, target, { via: [cache] })).toThrowError(
      'No path exists from "cache" to "end" while resolving packet route.',
    );
  });

  it('keeps packets on the first committed parallel edge style', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target, { style: { line: 'bezier' } });
    graph.connect(source, target, { style: { line: 'straight' } });
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(225);

    const [packetX, packetY] = vi.mocked(context.arc).mock.calls[0] ?? [];

    expect(packetX).toBeCloseTo(180.83, 2);
    expect(packetY).toBeCloseTo(144.62, 2);
  });

  it('marks a packet completed after its animation duration', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    graph.connect(source, target);

    const packet = graph.send(source, target);

    animation.step(900);

    expect(packet.progress).toBe(1);
    expect(packet.status).toBe('completed');
    expect(animation.pending()).toBe(0);
  });

  it('marks a multi-hop packet completed after the full route duration', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').done();
    const middle = graph.createNode('middle').done();
    const target = graph.createNode('target').done();

    graph.connect(source, middle);
    graph.connect(middle, target);

    const packet = graph.send(source, target);

    animation.step(900);

    expect(packet.progress).toBe(0.5);
    expect(packet.status).toBe('running');

    animation.step(1800);

    expect(packet.progress).toBe(1);
    expect(packet.status).toBe('completed');
    expect(animation.pending()).toBe(0);
  });
});
