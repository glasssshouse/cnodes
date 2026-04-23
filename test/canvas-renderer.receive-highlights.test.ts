import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph } from '../src/index';
import { stubAnimationFrame } from './support/animation';
import {
  createMockContext,
  setDevicePixelRatio,
  stubCanvasContext,
} from './support/canvas';

describe('canvas renderer receive highlights', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    setDevicePixelRatio(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('highlights only the final target when packet receiveHighlight is target', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const middle = graph.createNode('middle').at(280, 120).done();
    const target = graph.createNode('target').at(460, 120).done();

    graph.connect(source, middle);
    graph.connect(middle, target);
    graph.send(source, target, {
      packet: {
        color: '#f97316',
        receiveHighlight: 'target',
      },
    });

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    animation.step(900);

    expect(context.strokeRecords).not.toContainEqual(
      expect.objectContaining({
        shadowColor: '#f97316',
      }),
    );

    animation.step(1800);

    expect(context.strokeRecords).toContainEqual(
      expect.objectContaining({
        lineWidth: 4,
        shadowBlur: expect.any(Number),
        shadowColor: '#f97316',
        strokeStyle: '#f97316',
      }),
    );
  });

  it('highlights intermediate and final nodes when packet receiveHighlight is route', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const middle = graph.createNode('middle').at(280, 120).done();
    const target = graph.createNode('target').at(460, 120).done();

    graph.connect(source, middle);
    graph.connect(middle, target);
    graph.send(source, target, {
      packet: {
        color: '#22c55e',
        receiveHighlight: 'route',
      },
    });

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    animation.step(900);

    expect(context.strokeRecords).toContainEqual(
      expect.objectContaining({
        shadowColor: '#22c55e',
        strokeStyle: '#22c55e',
      }),
    );

    context.strokeRecords.length = 0;
    animation.step(1800);

    expect(context.strokeRecords).toContainEqual(
      expect.objectContaining({
        shadowColor: '#22c55e',
        strokeStyle: '#22c55e',
      }),
    );
  });
});
