import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraph, type CanvasRenderStatsSample } from '../src/index';
import { stubAnimationFrame } from './support/animation';
import { createMockContext, setDevicePixelRatio, stubCanvasContext } from './support/canvas';

describe('CanvasGraph', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    setDevicePixelRatio(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('mounts a canvas into the target container', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');

    const container = document.querySelector<HTMLDivElement>('#app');

    expect(graph).toBeInstanceOf(CanvasGraph);
    expect(container?.querySelector('canvas')).toBeInstanceOf(HTMLCanvasElement);
  });

  it('configures the canvas for device pixel ratio while preserving css size', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    setDevicePixelRatio(2);

    new CanvasGraph('app');

    const canvas = document.querySelector('canvas');

    expect(canvas?.width).toBe(1280);
    expect(canvas?.height).toBe(960);
    expect(canvas?.style.width).toBe('640px');
    expect(canvas?.style.height).toBe('480px');
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('resizes the canvas when the target size changes', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    const resizeObserver = stubResizeObserver();

    new CanvasGraph('app');

    const container = document.querySelector<HTMLDivElement>('#app');
    const canvas = document.querySelector('canvas');

    if (!container || !canvas) {
      throw new Error('Expected mounted graph elements.');
    }

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 600,
    });

    resizeObserver.trigger();

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(canvas.style.width).toBe('800px');
    expect(canvas.style.height).toBe('600px');
  });

  it('accepts a graph-level connection line style option', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    expect(() => new CanvasGraph('app', { connection: { line: 'bezier' } })).not.toThrow();
  });

  it('accepts a graph-level connection stroke style option', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    expect(() => new CanvasGraph('app', { connection: { stroke: 'animated' } })).not.toThrow();
    expect(() => new CanvasGraph('app', { connection: { stroke: 'dotted' } })).not.toThrow();
    expect(() => new CanvasGraph('app', { connection: { stroke: 'animated-dotted' } })).not.toThrow();
  });

  it('destroys animation and observers when destroy is called', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    const resizeObserver = stubResizeObserver();

    const graph = new CanvasGraph('app', { connection: { stroke: 'animated' } });
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    graph.connect(source, target);

    expect(animation.pending()).toBe(1);

    graph.destroy();

    expect(animation.pending()).toBe(0);
    expect(resizeObserver.disconnect).toHaveBeenCalledTimes(1);
  });

  it('ignores resize callbacks after destroy is called', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    const resizeObserver = stubResizeObserver();

    const graph = new CanvasGraph('app');
    const container = document.querySelector<HTMLDivElement>('#app');
    const canvas = document.querySelector('canvas');

    if (!container || !canvas) {
      throw new Error('Expected mounted graph elements.');
    }

    graph.destroy();
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 600,
    });

    resizeObserver.trigger();

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);
    expect(context.clearRect).not.toHaveBeenCalled();
  });

  it('publishes internal render stats samples', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    const samples: CanvasRenderStatsSample[] = [];

    const graph = new CanvasGraph('app', {
      debug: {
        onRenderStats(sample) {
          samples.push(sample);
        },
      },
    });

    graph.createNode('source').done();

    expect(samples).toHaveLength(1);
    expect(samples[0]).toMatchObject({
      animatedConnections: false,
      cause: 'static',
      connectionCount: 0,
      dragging: false,
      packetsActive: false,
      packetsCount: 0,
    });
    expect(samples[0]?.renderDurationMs).toBeGreaterThanOrEqual(0);
    expect(samples[0]?.timestamp).toBeGreaterThanOrEqual(0);
  });

  it('does not re-read target size on every animation frame', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const container = document.querySelector<HTMLDivElement>('#app');

    if (!container) {
      throw new Error('Expected graph container.');
    }

    let widthReads = 0;
    let heightReads = 0;

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get() {
        widthReads += 1;
        return 640;
      },
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      get() {
        heightReads += 1;
        return 480;
      },
    });

    const graph = new CanvasGraph(container, { connection: { stroke: 'animated' } });
    const source = graph.createNode('source').done();
    const target = graph.createNode('target').done();

    graph.connect(source, target);
    widthReads = 0;
    heightReads = 0;

    animation.step(16);

    expect(widthReads).toBe(0);
    expect(heightReads).toBe(0);
  });

  it('throws when the target container cannot be found', () => {
    stubCanvasContext(createMockContext());

    expect(() => new CanvasGraph('missing')).toThrowError(
      'Target container "missing" was not found.',
    );
  });

  it('throws when a 2d rendering context cannot be acquired', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(() => new CanvasGraph('app')).toThrowError(
      'A 2D canvas rendering context is required.',
    );
  });
});

type ResizeObserverController = {
  disconnect: ReturnType<typeof vi.fn>;
  trigger(): void;
};

function stubResizeObserver(): ResizeObserverController {
  let callback: ResizeObserverCallback | null = null;
  const disconnect = vi.fn();

  class MockResizeObserver {
    constructor(nextCallback: ResizeObserverCallback) {
      callback = nextCallback;
    }

    observe(): void {}

    disconnect(): void {
      disconnect();
    }
  }

  vi.stubGlobal('ResizeObserver', MockResizeObserver);

  return {
    disconnect,
    trigger(): void {
      callback?.([], {} as ResizeObserver);
    },
  };
}
