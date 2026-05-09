import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as packetRoutePoints from '../src/render/packet-route-points';
import { CanvasGraph, type CanvasRenderStatsSample } from '../src/index';
import { stubAnimationFrame } from './support/animation';
import { createMockContext, stubCanvasContext } from './support/canvas';

describe('interaction', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies hover styling when the pointer moves over a node', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const canvas = getCanvas();

    graph.createNode('source').at(100, 120).done();
    stubCanvasRect(canvas);

    const previousStrokeCount = context.strokeRecords.length;

    canvas.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 120 }));

    expect(context.strokeRecords[previousStrokeCount]).toMatchObject({
      lineWidth: 2.5,
      strokeStyle: 'rgba(15, 23, 42, 0.28)',
    });
  });

  it('clears hover styling when the pointer moves back to empty space', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const canvas = getCanvas();

    graph.createNode('source').at(100, 120).done();
    stubCanvasRect(canvas);

    canvas.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 120 }));
    const previousStrokeCount = context.strokeRecords.length;

    canvas.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 300, clientY: 300 }));

    expect(context.strokeRecords[previousStrokeCount]).toMatchObject({
      lineWidth: 1.5,
      strokeStyle: 'rgba(15, 23, 42, 0.12)',
    });
  });

  it('does not apply special hover treatment when the pointer moves over a connection', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    graph.connect(source, target);

    const previousStrokeCount = context.strokeRecords.length;

    canvas.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 190, clientY: 180 }));

    expect(context.strokeRecords).toHaveLength(previousStrokeCount);
  });

  it('toggles node selection with shift-click and renders selected styling', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const canvas = getCanvas();

    graph.createNode('source').at(100, 120).done();
    stubCanvasRect(canvas);
    context.strokeRecords.length = 0;

    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 120,
      shiftKey: true,
    }));

    expect(context.strokeRecords).toContainEqual(
      expect.objectContaining({
        lineWidth: 3,
        strokeStyle: '#38bdf8',
      }),
    );

    context.strokeRecords.length = 0;
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 120,
      shiftKey: true,
    }));

    expect(context.strokeRecords).not.toContainEqual(
      expect.objectContaining({
        lineWidth: 3,
        strokeStyle: '#38bdf8',
      }),
    );
  });

  it('starts dragging a node on pointer down and updates its coordinates on pointer move', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);

    expect(source.x).toBe(180);
    expect(source.y).toBe(200);
    expect(context.roundRect).toHaveBeenLastCalledWith(120, 170, 120, 60, 18);
  });

  it('uses the auto-grown node height for drag hit-testing', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').title('Source Node').size(80, 60).at(100, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 151 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 191 }));
    animation.step(16);

    expect(source.height).toBe(64);
    expect(source.x).toBe(140);
    expect(source.y).toBe(160);
    expect(context.roundRect).toHaveBeenLastCalledWith(100, 128, 80, 64, 18);
  });

  it('moves all selected nodes when dragging one selected node', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 120,
      shiftKey: true,
    }));
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 280,
      clientY: 120,
      shiftKey: true,
    }));

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);

    expect(source.x).toBe(180);
    expect(source.y).toBe(200);
    expect(target.x).toBe(360);
    expect(target.y).toBe(200);
  });

  it('clears selected nodes when dragging an unselected node', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();
    const other = graph.createNode('other').at(460, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 120,
      shiftKey: true,
    }));
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 280,
      clientY: 120,
      shiftKey: true,
    }));

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 460, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 540, clientY: 200 }));
    animation.step(16);
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 540, clientY: 200 }));

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 160 }));
    animation.step(32);

    expect(source.x).toBe(140);
    expect(source.y).toBe(160);
    expect(target.x).toBe(280);
    expect(target.y).toBe(120);
    expect(other.x).toBe(540);
    expect(other.y).toBe(200);
  });

  it('clears selected nodes when clicking empty canvas space', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 120,
      shiftKey: true,
    }));
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 280,
      clientY: 120,
      shiftKey: true,
    }));
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 520, clientY: 360 }));

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 160 }));
    animation.step(16);

    expect(source.x).toBe(140);
    expect(source.y).toBe(160);
    expect(target.x).toBe(280);
    expect(target.y).toBe(120);
  });

  it('restores persisted node coordinates when layout persistence is enabled', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    const storage = createStorage({
      'cnodes:layout:app': JSON.stringify({
        source: { x: 260, y: 210 },
      }),
    });

    const graph = new CanvasGraph('app', {
      layoutPersistence: {
        enabled: true,
        storage,
      },
    });

    const source = graph.createNode('source').id('source').at(100, 120).done();

    expect(source.x).toBe(260);
    expect(source.y).toBe(210);
    expect(context.roundRect).toHaveBeenLastCalledWith(200, 180, 120, 60, 18);
  });

  it('restores explicit-id node coordinates even when creation order changes', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    const storage = createStorage({
      'cnodes:layout:app': JSON.stringify({
        source: { x: 320, y: 160 },
      }),
    });

    const graph = new CanvasGraph('app', {
      layoutPersistence: {
        enabled: true,
        storage,
      },
    });

    graph.createNode('other').id('other').at(100, 120).done();
    const source = graph.createNode('source').id('source').at(100, 120).done();

    expect(source.x).toBe(320);
    expect(source.y).toBe(160);
  });

  it('updates connected line endpoints when a node moves', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    graph.connect(source, target);

    vi.clearAllMocks();
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    vi.clearAllMocks();
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);

    const [startX, startY] = vi.mocked(context.moveTo).mock.calls[0] ?? [];
    const [endX, endY] = vi.mocked(context.lineTo).mock.calls[0] ?? [];

    expect(startX).toBeCloseTo(236.54, 2);
    expect(startY).toBeCloseTo(222.61, 2);
    expect(endX).toBeCloseTo(223.46, 2);
    expect(endY).toBeCloseTo(217.39, 2);
  });

  it('keeps bezier connections anchored to the node bounds while dragging', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app', { connection: { line: 'bezier' } });
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    graph.connect(source, target);

    vi.clearAllMocks();
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    vi.clearAllMocks();
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);

    expect(context.moveTo).toHaveBeenNthCalledWith(1, 240, 200);
    expect(context.bezierCurveTo).toHaveBeenCalledWith(265, 200, 181, 240, 206, 240);
    expect(context.moveTo).toHaveBeenNthCalledWith(2, 218, 240);
  });

  it('renders packets along the updated connection segment while a node is dragged', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    graph.connect(source, target);
    graph.send(source, target);
    animation.step(450);

    vi.clearAllMocks();
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 280, clientY: 240 }));
    vi.clearAllMocks();
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 380, clientY: 240 }));
    animation.step(466);

    const [packetX, packetY] = vi.mocked(context.arc).mock.calls[0] ?? [];

    expect(packetX).toBeGreaterThan(235);
    expect(packetX).toBeLessThan(250);
    expect(packetY).toBeGreaterThan(170);
    expect(packetY).toBeLessThan(190);
  });

  it('invalidates packet route geometry once after drag movement, then reuses it on later frames', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    const buildPacketRoutePoints = vi.spyOn(packetRoutePoints, 'buildPacketRoutePoints');

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    graph.connect(source, target);
    graph.send(source, target);

    buildPacketRoutePoints.mockClear();
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);

    expect(buildPacketRoutePoints).toHaveBeenCalledTimes(1);

    buildPacketRoutePoints.mockClear();
    animation.step(32);

    expect(buildPacketRoutePoints).not.toHaveBeenCalled();
  });

  it('stops dragging after pointer up', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 180, clientY: 200 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 240, clientY: 260 }));

    expect(source.x).toBe(180);
    expect(source.y).toBe(200);
  });

  it('persists dragged node coordinates on pointer up when layout persistence is enabled', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    const storage = createStorage();

    const graph = new CanvasGraph('app', {
      layoutPersistence: {
        enabled: true,
        storage,
      },
    });
    graph.createNode('source').id('source').at(100, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 180, clientY: 200 }));

    expect(storage.setItem).toHaveBeenCalledWith(
      'cnodes:layout:app',
      JSON.stringify({
        source: { x: 180, y: 200 },
      }),
    );
  });

  it('persists every explicit-id node moved by a selected group drag', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    const storage = createStorage();

    const graph = new CanvasGraph('app', {
      layoutPersistence: {
        enabled: true,
        storage,
      },
    });
    graph.createNode('source').id('source').at(100, 120).done();
    graph.createNode('target').id('target').at(280, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 120,
      shiftKey: true,
    }));
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 280,
      clientY: 120,
      shiftKey: true,
    }));
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 180, clientY: 200 }));

    expect(storage.setItem).toHaveBeenLastCalledWith(
      'cnodes:layout:app',
      JSON.stringify({
        source: { x: 180, y: 200 },
        target: { x: 360, y: 200 },
      }),
    );
  });

  it('does not persist generated runtime ids on drag', () => {
    const context = createMockContext();
    stubCanvasContext(context);
    const storage = createStorage();

    const graph = new CanvasGraph('app', {
      layoutPersistence: {
        enabled: true,
        storage,
      },
    });
    graph.createNode('source').at(100, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 180, clientY: 200 }));

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('batches drag redraws to animation frames', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    graph.createNode('source').at(100, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    vi.clearAllMocks();

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    vi.clearAllMocks();

    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 120, clientY: 140 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 160 }));

    expect(context.clearRect).not.toHaveBeenCalled();
    expect(animation.pending()).toBe(1);

    animation.step(16);

    expect(context.clearRect).toHaveBeenCalledTimes(1);
  });

  it('publishes drag render stats while a node is moving', () => {
    const context = createMockContext();
    const animation = stubAnimationFrame();
    stubCanvasContext(context);
    const samples: CanvasRenderStatsSample[] = [];

    const graph = new CanvasGraph('app', {
      debug: {
        onRenderStats(sample) {
          samples.push(sample);
        },
      },
    });

    graph.createNode('source').at(100, 120).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    samples.length = 0;

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 180, clientY: 200 }));
    animation.step(16);

    expect(samples[samples.length - 1]).toMatchObject({
      cause: 'drag',
      dragging: true,
      packetsActive: false,
    });
  });

  it('does not react to keyboard deletion anymore', () => {
    const context = createMockContext();
    stubCanvasContext(context);

    const graph = new CanvasGraph('app');
    const source = graph.createNode('source').at(100, 120).done();
    const target = graph.createNode('target').at(280, 240).done();
    const canvas = getCanvas();

    stubCanvasRect(canvas);
    graph.connect(source, target);

    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Delete' }));

    expect(() => graph.send(source, target)).not.toThrow();
  });
});

function getCanvas(): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas');

  if (!canvas) {
    throw new Error('Expected a mounted canvas.');
  }

  return canvas;
}

function stubCanvasRect(canvas: HTMLCanvasElement): void {
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    bottom: 480,
    height: 480,
    left: 0,
    right: 640,
    top: 0,
    width: 640,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function createStorage(entries: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(entries));

  return {
    clear: vi.fn(() => {
      values.clear();
    }),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    get length() {
      return values.size;
    },
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}
