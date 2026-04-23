import { describe, expect, it, vi } from 'vitest';

import {
  buildDemoGraph,
  getImportantTrafficRoute,
  getTrafficRoutes,
} from '../demo/demo-graph';
import { stubAnimationFrame } from './support/animation';
import { createMockContext, stubCanvasContext } from './support/canvas';

describe('demo graph', () => {
  it('rebuilds with the requested theme preset', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const graphMount = document.querySelector<HTMLDivElement>('#app');

    if (!graphMount) {
      throw new Error('Expected demo root.');
    }

    const context = createMockContext();

    stubCanvasContext(context);

    buildDemoGraph(graphMount, {
      animatedConnections: true,
      onRenderStats: vi.fn(),
      packetTrails: false,
      portsVisible: false,
      themePreset: 'forest',
    });

    expect(context.fillRecords[0]).toMatchObject({
      fillStyle: '#166534',
    });
  });

  it('renders visible ports in the demo graph when enabled', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const graphMount = document.querySelector<HTMLDivElement>('#app');

    if (!graphMount) {
      throw new Error('Expected demo root.');
    }

    const context = createMockContext();

    stubCanvasContext(context);

    buildDemoGraph(graphMount, {
      animatedConnections: true,
      onRenderStats: vi.fn(),
      packetTrails: false,
      portsVisible: true,
      themePreset: 'default',
    });

    expect(context.arc).toHaveBeenCalled();
  });

  it('renders connection labels in the demo graph', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const graphMount = document.querySelector<HTMLDivElement>('#app');

    if (!graphMount) {
      throw new Error('Expected demo root.');
    }

    const context = createMockContext();

    stubCanvasContext(context);

    buildDemoGraph(graphMount, {
      animatedConnections: true,
      onRenderStats: vi.fn(),
      packetTrails: false,
      portsVisible: false,
      themePreset: 'default',
    });

    expect(context.fillText).toHaveBeenCalledWith(
      'ingress',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('enables packet trails in the demo graph when requested', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const graphMount = document.querySelector<HTMLDivElement>('#app');

    if (!graphMount) {
      throw new Error('Expected demo root.');
    }

    const context = createMockContext();
    const animation = stubAnimationFrame();

    stubCanvasContext(context);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const demoGraph = buildDemoGraph(graphMount, {
      animatedConnections: true,
      onRenderStats: vi.fn(),
      packetTrails: true,
      portsVisible: false,
      themePreset: 'default',
    });

    demoGraph.graph.send(demoGraph.ingress, demoGraph.router);
    context.strokeRecords.length = 0;
    animation.step(450);

    expect(context.strokeRecords).toContainEqual(
      expect.objectContaining({
        strokeStyle: 'rgba(249, 115, 22, 0.32)',
      }),
    );
  });

  it('exposes direct and waypoint event routes for the demo controls', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const graphMount = document.querySelector<HTMLDivElement>('#app');

    if (!graphMount) {
      throw new Error('Expected demo root.');
    }

    stubCanvasContext(createMockContext());

    const demoGraph = buildDemoGraph(graphMount, {
      animatedConnections: true,
      onRenderStats: vi.fn(),
      packetTrails: false,
      portsVisible: false,
      themePreset: 'default',
    });

    expect(getTrafficRoutes(demoGraph)).toEqual([
      {
        action: {
          sourceNodeId: 'ingress',
          targetNodeId: 'target',
          type: 'packet:send',
        },
        label: 'Direct',
      },
      {
        action: {
          sourceNodeId: 'ingress',
          targetNodeId: 'target',
          type: 'packet:send',
          viaNodeIds: ['router', 'balancer', 'cache'],
        },
        label: 'Cache route',
      },
      {
        action: {
          sourceNodeId: 'ingress',
          targetNodeId: 'target',
          type: 'packet:send',
          viaNodeIds: ['router', 'balancer', 'worker'],
        },
        label: 'Worker route',
      },
    ]);
  });

  it('exposes an important demo route with receive highlighting', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const graphMount = document.querySelector<HTMLDivElement>('#app');

    if (!graphMount) {
      throw new Error('Expected demo root.');
    }

    stubCanvasContext(createMockContext());

    const demoGraph = buildDemoGraph(graphMount, {
      animatedConnections: true,
      onRenderStats: vi.fn(),
      packetTrails: false,
      portsVisible: false,
      themePreset: 'default',
    });

    expect(getImportantTrafficRoute(demoGraph)).toEqual({
      action: {
        packet: {
          color: '#f97316',
          radius: 10,
          receiveHighlight: 'route',
          trail: true,
        },
        sourceNodeId: 'ingress',
        targetNodeId: 'target',
        type: 'packet:send',
        viaNodeIds: ['router', 'balancer', 'worker'],
      },
      label: 'Important route',
    });
  });
});
