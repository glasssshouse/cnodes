import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph } from '../src/index';
import {
  createMockContext,
  setDevicePixelRatio,
  stubCanvasContext,
} from './support/canvas';
import { stubAnimationFrame } from './support/animation';

describe('canvas rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    setDevicePixelRatio(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redraws the canvas when a node is committed', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph
      .createNode('source')
      .title('Source')
      .color('#4f46e5')
      .at(100, 120)
      .shape('rect')
      .size(200, 80)
      .done();

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    expect(context.roundRect).toHaveBeenCalledWith(0, 80, 200, 80, 18);
    expect(context.fillText).toHaveBeenCalledWith('Source', 100, 120);
  });

  it('renders a short title unchanged at the default font', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph.createNode('source').title('Source').size(120, 60).at(100, 120).done();

    expect(context.font).toBe('600 14px sans-serif');
    expect(context.fillText).toHaveBeenCalledWith('Source', 100, 120);
  });

  it('wraps an overlong title across multiple lines inside the node', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph.createNode('source').title('Source Node').size(80, 60).at(100, 120).done();

    expect(context.fillText).toHaveBeenNthCalledWith(1, 'Source', 100, 110);
    expect(context.fillText).toHaveBeenNthCalledWith(2, 'Node', 100, 130);
  });

  it('draws circle nodes with arc calls', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph.createNode('source').title('Source').shape('circle').size(80, 40).at(100, 120).done();

    expect(context.beginPath).toHaveBeenCalledTimes(1);
    expect(context.arc).toHaveBeenCalledWith(100, 120, 20, 0, Math.PI * 2);
    expect(context.fill).toHaveBeenCalledTimes(1);
    expect(context.fillText).toHaveBeenCalledWith('Source', 100, 120);
  });

  it('renders the description below the node when present', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph
      .createNode('source')
      .title('Source')
      .description('Primary data source')
      .size(200, 80)
      .at(100, 120)
      .done();

    expect(context.fillText).toHaveBeenNthCalledWith(1, 'Source', 100, 120);
    expect(context.fillText).toHaveBeenNthCalledWith(2, 'Primary data source', 100, 172);
  });

  it('hard-wraps a long single-word title instead of truncating it', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph.createNode('source').title('ABCDEFGHIJKLMNO').size(80, 60).at(100, 120).done();

    expect(context.fillText).toHaveBeenNthCalledWith(1, 'ABCDEF', 100, 100);
    expect(context.fillText).toHaveBeenNthCalledWith(2, 'GHIJKL', 100, 120);
    expect(context.fillText).toHaveBeenNthCalledWith(3, 'MNO', 100, 140);
  });

  it('wraps description text below the node across multiple lines', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph
      .createNode('source')
      .title('Source')
      .description('Primary data source')
      .size(120, 60)
      .at(100, 120)
      .done();

    expect(context.fillText).toHaveBeenNthCalledWith(1, 'Source', 100, 120);
    expect(context.fillText).toHaveBeenNthCalledWith(2, 'Primary data', 100, 162);
    expect(context.fillText).toHaveBeenNthCalledWith(3, 'source', 100, 178);
  });

  it('keeps logical draw coordinates under dpr scaling', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    setDevicePixelRatio(2);

    const graph = new CanvasGraph('app');

    graph.createNode('source').title('Source').at(100, 120).done();

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    expect(context.roundRect).toHaveBeenCalledWith(40, 90, 120, 60, 18);
    expect(context.fillText).toHaveBeenCalledWith('Source', 100, 120);
  });

  it('draws a straight connection between node centers', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const [startX, startY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [endX, endY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];

    expect(context.beginPath).toHaveBeenCalled();
    expect(startX).toBeCloseTo(144.70, 2);
    expect(startY).toBeCloseTo(149.80, 2);
    expect(endX).toBeCloseTo(235.30, 2);
    expect(endY).toBeCloseTo(210.20, 2);
    expect(context.stroke).toHaveBeenCalled();
  });

  it('keeps the current free-boundary anchors when ports are not visible', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const [startX, startY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [endX, endY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];

    expect(startX).toBeCloseTo(160, 2);
    expect(startY).toBeCloseTo(120, 2);
    expect(endX).toBeCloseTo(220, 2);
    expect(endY).toBeCloseTo(120, 2);
    expect(context.arc).not.toHaveBeenCalled();
  });

  it('renders used endpoint ports and anchors horizontal connections to them when ports are visible', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      ports: {
        visible: true,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const [startX, startY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [endX, endY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];

    expect(startX).toBeCloseTo(160, 2);
    expect(startY).toBeCloseTo(120, 2);
    expect(endX).toBeCloseTo(220, 2);
    expect(endY).toBeCloseTo(120, 2);
    expect(context.arc).toHaveBeenNthCalledWith(1, 160, 120, 5, 0, Math.PI * 2);
    expect(context.arc).toHaveBeenNthCalledWith(2, 220, 120, 5, 0, Math.PI * 2);
  });

  it('anchors vertical connections to top and bottom ports when ports are visible', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      ports: {
        visible: true,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(100, 300).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const [startX, startY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [endX, endY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];

    expect(startX).toBeCloseTo(100, 2);
    expect(startY).toBeCloseTo(150, 2);
    expect(endX).toBeCloseTo(100, 2);
    expect(endY).toBeCloseTo(270, 2);
    expect(context.arc).toHaveBeenNthCalledWith(1, 100, 150, 5, 0, Math.PI * 2);
    expect(context.arc).toHaveBeenNthCalledWith(2, 100, 270, 5, 0, Math.PI * 2);
  });

  it('anchors connections to explicit named ports when provided', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph
      .createNode('source')
      .at(100, 120)
      .port('out', { side: 'top' })
      .done();
    const target = graph
      .createNode('target')
      .at(280, 120)
      .port('in', { side: 'bottom' })
      .done();

    vi.clearAllMocks();
    graph.connect(source, target, {
      sourcePort: 'out',
      targetPort: 'in',
    });

    const [startX, startY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [endX, endY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];

    expect(startX).toBeCloseTo(100, 2);
    expect(startY).toBeCloseTo(90, 2);
    expect(endX).toBeCloseTo(280, 2);
    expect(endY).toBeCloseTo(150, 2);
  });

  it('anchors diagonal straight connections to the rounded rect outline', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').size(160, 72).at(300, 220).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const [startX, startY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [endX, endY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];

    expect(startX).toBeCloseTo(152.80, 2);
    expect(startY).toBeCloseTo(146.40, 2);
    expect(endX).toBeCloseTo(230.91, 2);
    expect(endY).toBeCloseTo(185.46, 2);
  });

  it('renders solid connection strokes by default', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    context.strokeRecords.length = 0;
    graph.connect(source, target);

    expect(animation.pending()).toBe(0);
    expect(context.strokeRecords[0]).toMatchObject({
      lineDash: [],
      lineDashOffset: 0,
    });
  });

  it('animates dashed connection strokes when the stroke style is animated', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', { connection: { stroke: 'animated' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);

    expect(animation.pending()).toBe(1);

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    animation.step(160);

    expect(context.setLineDash).toHaveBeenCalledWith([10, 8]);
    expect(context.strokeRecords[0]).toMatchObject({
      lineDash: [10, 8],
      lineDashOffset: -8,
    });
  });

  it('renders dotted connection strokes without starting the animation loop', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', { connection: { stroke: 'dotted' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    context.strokeRecords.length = 0;
    graph.connect(source, target);

    expect(animation.pending()).toBe(0);
    expect(context.strokeRecords[0]).toMatchObject({
      lineDash: [2, 10],
      lineDashOffset: 0,
    });
  });

  it('animates dotted connection strokes when the stroke style is animated-dotted', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', { connection: { stroke: 'animated-dotted' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    graph.connect(source, target);

    expect(animation.pending()).toBe(1);

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    animation.step(160);

    expect(context.strokeRecords[0]).toMatchObject({
      lineDash: [2, 10],
      lineDashOffset: -8,
    });
  });

  it('uses per-connection visual overrides instead of graph defaults', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      connection: {
        arrow: 'end',
        color: '#64748b',
        line: 'straight',
        stroke: 'solid',
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    context.strokeRecords.length = 0;
    context.fillRecords.length = 0;
    graph.connect(source, target, {
      style: {
        arrow: 'both',
        color: '#dc2626',
        line: 'bezier',
        stroke: 'animated-dotted',
      },
    });

    expect(animation.pending()).toBe(1);
    expect(context.bezierCurveTo).toHaveBeenCalled();
    expect(context.strokeRecords[0]).toMatchObject({
      lineDash: [2, 10],
      strokeStyle: '#dc2626',
    });
    expect(context.fillRecords[context.fillRecords.length - 2]).toMatchObject({
      fillStyle: '#dc2626',
    });
    expect(context.fillRecords[context.fillRecords.length - 1]).toMatchObject({
      fillStyle: '#dc2626',
    });
  });

  it('renders no arrowhead when a connection uses arrow style none', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    vi.clearAllMocks();
    graph.connect(source, target, {
      style: {
        arrow: 'none',
      },
    });

    expect(context.closePath).not.toHaveBeenCalled();
  });

  it('renders a start arrowhead without rendering an end arrowhead', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    context.fillRecords.length = 0;
    vi.clearAllMocks();
    graph.connect(source, target, {
      style: {
        arrow: 'start',
      },
    });

    expect(context.closePath).toHaveBeenCalledTimes(1);
    expect(context.fillRecords[context.fillRecords.length - 1]).toMatchObject({
      fillStyle: '#64748b',
    });
  });

  it('renders mixed straight and bezier connections in the same graph', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const middle = graph.createNode('middle').at(280, 120).done();
    const target = graph.createNode('target').at(460, 240).done();

    graph.connect(source, middle);

    vi.clearAllMocks();
    graph.connect(middle, target, {
      style: {
        line: 'bezier',
      },
    });

    expect(context.lineTo).toHaveBeenCalled();
    expect(context.bezierCurveTo).toHaveBeenCalled();
  });

  it('draws a bezier connection when the graph line style is bezier', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', { connection: { line: 'bezier' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    expect(context.moveTo).toHaveBeenNthCalledWith(1, 160, 120);
    expect(context.bezierCurveTo).toHaveBeenCalledWith(205, 120, 161, 240, 206, 240);
    expect(context.moveTo).toHaveBeenNthCalledWith(2, 218, 240);
    expect(context.lineTo).toHaveBeenCalledTimes(2);
    expect(context.stroke).toHaveBeenCalled();
  });

  it('renders a straight connection label at the visible path midpoint', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    vi.clearAllMocks();
    graph.connect(source, target, {
      label: 'cache hit',
    });

    expect(context.fillText).toHaveBeenCalledWith('cache hit', 190, 120);
    expect(context.roundRect).toHaveBeenCalledWith(147.6, 108, 84.8, 24, 10);
  });

  it('renders a bezier connection label from the sampled visible path midpoint', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', { connection: { line: 'bezier' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();

    vi.clearAllMocks();
    graph.connect(source, target, {
      label: 'primary',
    });

    expect(context.fillText).toHaveBeenCalledWith(
      'primary',
      183,
      180,
    );
  });

  it('does not render empty connection labels', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    vi.clearAllMocks();
    graph.connect(source, target, {
      label: '   ',
    });

    expect(context.fillText).not.toHaveBeenCalledWith('   ', expect.any(Number), expect.any(Number));
  });

  it('renders a fixed end arrowhead that stops at the target boundary', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').size(160, 72).at(300, 220).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const [pathStartX, pathStartY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [pathEndX, pathEndY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];
    const [arrowTipX, arrowTipY] = vi.mocked(context.moveTo).mock.calls[1] ?? [];

    expect(pathStartX).toBeCloseTo(152.80, 2);
    expect(pathStartY).toBeCloseTo(146.40, 2);
    expect(pathEndX).toBeCloseTo(230.91, 2);
    expect(pathEndY).toBeCloseTo(185.46, 2);
    expect(arrowTipX).toBeCloseTo(229.12, 2);
    expect(arrowTipY).toBeCloseTo(184.56, 2);
    expect(context.lineTo).toHaveBeenCalledTimes(3);
    expect(context.closePath).toHaveBeenCalledTimes(1);
    expect(context.fill).toHaveBeenCalled();
  });

  it('renders rounded-rect target arrowheads above the node surface', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').size(160, 72).at(300, 220).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const arrowMoveOrder = vi.mocked(context.moveTo).mock.invocationCallOrder[1];
    const nodeSurfaceOrder =
      vi.mocked(context.roundRect).mock.invocationCallOrder[
        vi.mocked(context.roundRect).mock.invocationCallOrder.length - 1
      ];

    expect(arrowMoveOrder).toBeGreaterThan(nodeSurfaceOrder ?? Number.NEGATIVE_INFINITY);
  });

  it('keeps rounded-rect target arrowhead tips slightly outside the node edge', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').size(160, 72).at(300, 220).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const [pathEndX, pathEndY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];
    const [arrowTipX, arrowTipY] = vi.mocked(context.moveTo).mock.calls[1] ?? [];

    expect(pathEndX).toBeCloseTo(230.91, 2);
    expect(pathEndY).toBeCloseTo(185.46, 2);
    expect(arrowTipX).toBeCloseTo(229.12, 2);
    expect(arrowTipY).toBeCloseTo(184.56, 2);
  });

  it('renders connections before nodes', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').title('Source').at(100, 120).done();
    const target = graph.createNode('target').title('Target').at(280, 240).done();

    vi.clearAllMocks();
    graph.connect(source, target);

    const moveToOrder = vi.mocked(context.moveTo).mock.invocationCallOrder[0];
    const roundRectOrder =
      vi.mocked(context.roundRect).mock.invocationCallOrder[
        vi.mocked(context.roundRect).mock.invocationCallOrder.length - 1
      ];

    expect(moveToOrder).toBeLessThan(roundRectOrder ?? Number.POSITIVE_INFINITY);
  });

  it('renders rect nodes with a polished surface treatment', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph
      .createNode('source')
      .title('Source')
      .color('#4f46e5')
      .size(200, 80)
      .at(100, 120)
      .done();

    expect(context.save).toHaveBeenCalled();
    expect(context.roundRect).toHaveBeenCalledWith(0, 80, 200, 80, 18);
    expect(context.stroke).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalled();
  });

  it('uses graph theme tokens for node surface and text rendering', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      theme: {
        preset: 'ocean',
      },
    });

    graph.createNode('source').title('Source').done();

    expect(context.fillRecords[0]).toMatchObject({
      fillStyle: '#0f766e',
    });
    expect(context.strokeRecords[0]).toMatchObject({
      strokeStyle: '#0f172a',
    });
    expect(context.fillText).toHaveBeenCalledWith('Source', 0, 0);
    expect(context.fillStyle).toBe('#e2f8f5');
  });

  it('uses graph theme tokens for port rendering when ports are visible', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      ports: {
        visible: true,
      },
      theme: {
        preset: 'ocean',
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    context.fillRecords.length = 0;
    context.strokeRecords.length = 0;
    vi.clearAllMocks();
    graph.connect(source, target);

    expect(context.fillRecords).toContainEqual(expect.objectContaining({
      fillStyle: '#e2f8f5',
    }));
    expect(context.strokeRecords).toContainEqual(expect.objectContaining({
      strokeStyle: '#22d3ee',
    }));
  });

  it('renders connection labels from port-based paths when ports are visible', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      ports: {
        visible: true,
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    vi.clearAllMocks();
    graph.connect(source, target, {
      label: 'port route',
    });

    expect(context.fillText).toHaveBeenCalledWith('port route', 190, 120);
  });

  it('uses graph theme tokens for connection label rendering', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', {
      theme: {
        preset: 'forest',
      },
    });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    context.fillRecords.length = 0;
    context.strokeRecords.length = 0;
    vi.clearAllMocks();
    graph.connect(source, target, {
      label: 'primary',
    });

    expect(context.fillRecords).toContainEqual(expect.objectContaining({
      fillStyle: 'rgba(240, 253, 244, 0.9)',
    }));
    expect(context.strokeRecords).toContainEqual(expect.objectContaining({
      strokeStyle: 'rgba(132, 204, 22, 0.34)',
    }));
    expect(context.fillText).toHaveBeenCalledWith('primary', 190, 120);
    expect(context.fillTextRecords).toContainEqual(expect.objectContaining({
      fillStyle: '#14532d',
      text: 'primary',
    }));
  });

  it('draws only the main connection stroke and arrowheads', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();

    vi.clearAllMocks();
    context.strokeRecords.length = 0;
    graph.connect(source, target);

    expect(context.strokeRecords).toHaveLength(3);
    expect(context.strokeRecords).not.toContainEqual(expect.objectContaining({
      shadowBlur: expect.any(Number),
      shadowColor: '#64748b',
    }));
  });

  it('renders circle nodes with the same polished visual language', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    graph.createNode('source').title('Source').shape('circle').size(72, 72).at(100, 120).done();

    expect(context.save).toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalledWith(100, 120, 36, 0, Math.PI * 2);
    expect(context.stroke).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalled();
  });
});
