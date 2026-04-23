import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph } from '../src/index';
import { stubAnimationFrame } from './support/animation';
import { createMockContext, stubCanvasContext } from './support/canvas';

describe('graph actions', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches a packet send action from serializable node ids', () => {
    const animation = stubAnimationFrame();
    stubCanvasContext(createMockContext());

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('ingress').done();
    const target = graph.createNode('target').id('egress').done();

    graph.connect(source, target);

    const result = graph.dispatch({
      sourceNodeId: 'ingress',
      targetNodeId: 'egress',
      type: 'packet:send',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }
    expect(result.packet.sourceNodeId).toBe('ingress');
    expect(result.packet.targetNodeId).toBe('egress');
    expect(animation.pending()).toBe(1);
  });

  it('dispatches a packet send action through serializable waypoint node ids', () => {
    const animation = stubAnimationFrame();
    stubCanvasContext(createMockContext());

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('ingress').at(100, 120).done();
    const cache = graph.createNode('cache').id('cache').at(220, 120).done();
    const worker = graph
      .createNode('worker')
      .id('cache-worker')
      .at(340, 120)
      .done();
    const target = graph.createNode('target').id('egress').at(460, 120).done();

    graph.connect(source, target);
    graph.connect(source, cache);
    graph.connect(cache, worker);
    graph.connect(worker, target);

    const result = graph.dispatch({
      sourceNodeId: 'ingress',
      targetNodeId: 'egress',
      type: 'packet:send',
      viaNodeIds: ['cache', 'cache-worker'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }

    vi.clearAllMocks();
    animation.step(900);

    expect(result.packet.progress).toBeCloseTo(1 / 3);
  });

  it('dispatches packet send actions with serializable packet styling', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      packet: {
        radius: 4,
        trail: false,
      },
    });
    const source = graph.createNode('source').id('ingress').at(100, 120).done();
    const target = graph.createNode('target').id('egress').at(280, 120).done();

    graph.connect(source, target);

    const result = graph.dispatch({
      packet: {
        color: '#f59e0b',
        radius: 9,
        trail: true,
        trailColor: 'rgba(245, 158, 11, 0.3)',
        trailLength: 16,
      },
      sourceNodeId: 'ingress',
      targetNodeId: 'egress',
      type: 'packet:send',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }

    vi.clearAllMocks();
    context.fillRecords.length = 0;
    context.strokeRecords.length = 0;
    animation.step(450);

    expect(vi.mocked(context.arc).mock.calls).toContainEqual([
      expect.any(Number),
      expect.any(Number),
      9,
      0,
      Math.PI * 2,
    ]);
    expect(context.fillRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fillStyle: '#f59e0b' }),
      ]),
    );
    expect(context.strokeRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineWidth: 9,
          strokeStyle: 'rgba(245, 158, 11, 0.3)',
        }),
      ]),
    );
  });

  it('dispatches packet send actions with receive highlights', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').id('ingress').at(100, 120).done();
    const target = graph.createNode('target').id('egress').at(280, 120).done();

    graph.connect(source, target);

    const result = graph.dispatch({
      packet: {
        color: '#0ea5e9',
        receiveHighlight: 'target',
      },
      sourceNodeId: 'ingress',
      targetNodeId: 'egress',
      type: 'packet:send',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    animation.step(900);

    expect(context.strokeRecords).toContainEqual(expect.objectContaining({
      shadowColor: '#0ea5e9',
      strokeStyle: '#0ea5e9',
    }));
  });

  it('returns an action error instead of throwing for invalid packet send actions', () => {
    stubAnimationFrame();
    stubCanvasContext(createMockContext());

    const graph = new CanvasGraph('app');
    graph.createNode('source').id('ingress').done();

    const result = graph.dispatch({
      sourceNodeId: 'ingress',
      targetNodeId: 'missing',
      type: 'packet:send',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected dispatch to fail');
    }
    expect(result.error.message).toBe(
      'Target node "missing" is not part of this graph.',
    );
  });
});
