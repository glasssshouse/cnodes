import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph } from '../src/index';
import { stubAnimationFrame } from './support/animation';
import {
  createMockContext,
  setDevicePixelRatio,
  stubCanvasContext,
} from './support/canvas';

describe('canvas renderer packet rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    setDevicePixelRatio(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses graph theme packet color for packet rendering', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', {
      theme: {
        preset: 'ember',
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);
    graph.send(source, target);
    context.fillRecords.length = 0;
    animation.step(225);

    expect(context.fillRecords[0]).toMatchObject({
      fillStyle: '#fb7185',
    });
  });

  it('renders a packet between connection endpoints', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);

    vi.clearAllMocks();
    graph.send(source, target);

    expect(context.arc).toHaveBeenNthCalledWith(
      1,
      144.69553676977304,
      149.79702451318204,
      6,
      0,
      Math.PI * 2,
    );
    expect(animation.pending()).toBe(1);
  });

  it('keeps default packets at the current radius without drawing a trail', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    animation.step(450);

    expect(context.arc).toHaveBeenNthCalledWith(1, 190, 120, 6, 0, Math.PI * 2);
    expect(context.strokeRecords).not.toContainEqual(
      expect.objectContaining({
        strokeStyle: 'rgba(249, 115, 22, 0.32)',
      }),
    );
  });

  it('uses the configured graph-wide packet radius', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', {
      packet: {
        radius: 10,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(450);

    expect(context.arc).toHaveBeenNthCalledWith(1, 190, 120, 10, 0, Math.PI * 2);
  });

  it('draws a packet trail before the packet dot when enabled', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', {
      packet: {
        trail: true,
        trailLength: 20,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    animation.step(450);

    expect(context.moveTo).toHaveBeenCalledWith(170, 120);
    expect(context.lineTo).toHaveBeenCalledWith(190, 120);
    expect(context.strokeRecords).toContainEqual(
      expect.objectContaining({
        lineWidth: 6,
        strokeStyle: 'rgba(249, 115, 22, 0.32)',
      }),
    );

    const trailStrokeOrder = vi.mocked(context.stroke).mock.invocationCallOrder[1];
    const packetArcOrder = vi.mocked(context.arc).mock.invocationCallOrder[0];

    expect(trailStrokeOrder ?? Number.NEGATIVE_INFINITY).toBeLessThan(
      packetArcOrder ?? Number.POSITIVE_INFINITY,
    );
  });

  it('uses trailLength to resolve the trail start along the route', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', {
      packet: {
        trail: true,
        trailLength: 10,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(450);

    expect(context.moveTo).toHaveBeenCalledWith(180, 120);
    expect(context.lineTo).toHaveBeenCalledWith(190, 120);
  });

  it('moves packet position as animation progresses', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(450);

    expect(context.arc).toHaveBeenNthCalledWith(1, 190, 180, 6, 0, Math.PI * 2);
  });

  it('moves a reverse packet from target to source over a bidirectional connection', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    graph.connect(source, target, {
      style: {
        arrow: 'none',
      },
      travel: 'both',
    });
    graph.send(target, source);

    vi.clearAllMocks();
    animation.step(225);

    expect(context.arc).toHaveBeenNthCalledWith(1, 205, 120, 6, 0, Math.PI * 2);
  });

  it('moves packet position along the bezier path when enabled', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', { connection: { line: 'bezier' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(225);

    const [packetX, packetY, packetRadius, startAngle, endAngle] =
      vi.mocked(context.arc).mock.calls[0] ?? [];

    expect(packetX).toBeCloseTo(180.83, 2);
    expect(packetY).toBeCloseTo(144.62, 2);
    expect(packetRadius).toBe(6);
    expect(startAngle).toBe(0);
    expect(endAngle).toBe(Math.PI * 2);
  });

  it('draws packet trails on bezier route points', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', {
      connection: {
        line: 'bezier',
      },
      packet: {
        trail: true,
        trailLength: 20,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(225);

    const trailMove = vi.mocked(context.moveTo).mock.calls.find(
      ([x, y]) =>
        typeof x === 'number'
        && typeof y === 'number'
        && x > 160
        && x < 181
        && y > 120
        && y < 145,
    );

    expect(trailMove).toBeDefined();
    expect(context.lineTo).toHaveBeenCalledWith(
      expect.closeTo(180.83, 2),
      expect.closeTo(144.62, 2),
    );
  });

  it('moves packet position along a per-connection bezier override', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target, {
      style: {
        line: 'bezier',
      },
    });
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(225);

    const [packetX, packetY, packetRadius, startAngle, endAngle] =
      vi.mocked(context.arc).mock.calls[0] ?? [];

    expect(packetX).toBeCloseTo(180.83, 2);
    expect(packetY).toBeCloseTo(144.62, 2);
    expect(packetRadius).toBe(6);
    expect(startAngle).toBe(0);
    expect(endAngle).toBe(Math.PI * 2);
  });

  it('moves a multi-hop packet smoothly through the intermediate node', () => {
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
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(900);

    expect(context.arc).toHaveBeenNthCalledWith(1, 280, 120, 6, 0, Math.PI * 2);
  });

  it('draws packet trails across multi-hop routes', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', {
      packet: {
        trail: true,
        trailLength: 20,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const middle = graph.createNode('middle').at(280, 120).done();
    const target = graph.createNode('target').at(460, 120).done();

    graph.connect(source, middle);
    graph.connect(middle, target);
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(900);

    expect(context.moveTo).toHaveBeenCalledWith(260, 120);
    expect(context.lineTo).toHaveBeenCalledWith(280, 120);
    expect(context.arc).toHaveBeenNthCalledWith(1, 280, 120, 6, 0, Math.PI * 2);
  });

  it('stops rendering a packet once it is completed', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);
    graph.send(source, target);

    vi.clearAllMocks();
    animation.step(900);

    expect(context.arc).not.toHaveBeenCalled();
  });
});
