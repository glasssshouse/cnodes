import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as geometry from '../src/core/geometry';
import * as packetRoutePoints from '../src/render/packet-route-points';
import { CanvasGraph } from '../src/index';
import { stubAnimationFrame } from './support/animation';
import {
  createMockContext,
  setDevicePixelRatio,
  stubCanvasContext,
} from './support/canvas';

describe('canvas renderer ordering and caching', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    setDevicePixelRatio(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders packets after connections and before nodes', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').title('Source').at(100, 120).done();
    const target = graph.createNode('target').title('Target').at(280, 240).done();

    graph.connect(source, target);

    vi.clearAllMocks();
    graph.send(source, target);

    const lineMoveOrder = vi.mocked(context.moveTo).mock.invocationCallOrder[0];
    const packetArcOrder = vi.mocked(context.arc).mock.invocationCallOrder[0];
    const nodeSurfaceOrder =
      vi.mocked(context.roundRect).mock.invocationCallOrder[
        vi.mocked(context.roundRect).mock.invocationCallOrder.length - 1
      ];

    expect(lineMoveOrder ?? Number.NEGATIVE_INFINITY).toBeLessThan(
      packetArcOrder ?? Number.POSITIVE_INFINITY,
    );
    expect(packetArcOrder ?? Number.NEGATIVE_INFINITY).toBeLessThan(
      nodeSurfaceOrder ?? Number.POSITIVE_INFINITY,
    );
    expect(animation.pending()).toBe(1);
  });

  it('renders connection labels after connection strokes and before packets', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').title('Source').at(100, 120).done();
    const target = graph.createNode('target').title('Target').at(280, 120).done();

    graph.connect(source, target, {
      label: 'route',
    });

    vi.clearAllMocks();
    graph.send(source, target);

    const labelCallIndex = vi.mocked(context.fillText).mock.calls.findIndex(
      ([text]) => text === 'route',
    );
    const lineStrokeOrder = vi.mocked(context.stroke).mock.invocationCallOrder[0];
    const labelTextOrder =
      vi.mocked(context.fillText).mock.invocationCallOrder[labelCallIndex];
    const packetArcOrder = vi.mocked(context.arc).mock.invocationCallOrder[0];

    expect(lineStrokeOrder ?? Number.NEGATIVE_INFINITY).toBeLessThan(
      labelTextOrder ?? Number.POSITIVE_INFINITY,
    );
    expect(labelTextOrder ?? Number.NEGATIVE_INFINITY).toBeLessThan(
      packetArcOrder ?? Number.POSITIVE_INFINITY,
    );
    expect(animation.pending()).toBe(1);
  });

  it('reuses wrapped text layout across repeated animation renders', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', { connection: { stroke: 'animated' } });
    const source = graph
      .createNode('source')
      .title('Source Node')
      .description('Description that should stay cached between frames.')
      .at(100, 120)
      .done();
    const target = graph
      .createNode('target')
      .title('Target Node')
      .description('Another wrapped description for cache reuse.')
      .at(280, 240)
      .done();

    graph.connect(source, target);

    vi.clearAllMocks();
    animation.step(16);

    expect(context.measureText).not.toHaveBeenCalled();
  });

  it('reuses sampled connection paths across repeated packet animation renders', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    const interpolatePointOnPath = vi.spyOn(geometry, 'interpolatePointOnPath');
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const graph = new CanvasGraph('app', { connection: { line: 'bezier' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);
    graph.send(source, target);

    interpolatePointOnPath.mockClear();
    animation.step(16);

    expect(interpolatePointOnPath).not.toHaveBeenCalled();
  });

  it('reuses cached packet route points across repeated animation renders', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const buildPacketRoutePoints = vi.spyOn(
      packetRoutePoints,
      'buildPacketRoutePoints',
    );

    const graph = new CanvasGraph('app', { connection: { stroke: 'animated' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);
    graph.send(source, target);

    expect(buildPacketRoutePoints).toHaveBeenCalledTimes(1);

    buildPacketRoutePoints.mockClear();
    animation.step(16);

    expect(buildPacketRoutePoints).not.toHaveBeenCalled();
  });
});
