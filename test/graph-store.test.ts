import { describe, expect, it } from 'vitest';

import { GraphStore } from '../src/core/graph-store';

describe('GraphStore', () => {
  it('removes completed packets from the renderable packet set', () => {
    const graphStore = new GraphStore();
    const source = graphStore.addNode({
      color: '#2563eb',
      height: 60,
      kind: 'source',
      title: 'Source',
      shape: 'rect',
      width: 120,
      x: 100,
      y: 120,
    });
    const target = graphStore.addNode({
      color: '#0f766e',
      height: 60,
      kind: 'target',
      title: 'Target',
      shape: 'rect',
      width: 120,
      x: 280,
      y: 240,
    });
    const connection = graphStore.addConnection({
      sourceNodeId: source.id,
      style: {
        arrow: 'end',
        color: '#64748b',
        line: 'straight',
        stroke: 'solid',
      },
      targetNodeId: target.id,
    });
    const packet = graphStore.addPacket(source.id, target.id, 0, [connection.id]);

    graphStore.advancePackets(900, 900);

    expect(packet.status).toBe('completed');
    expect(graphStore.getRenderablePackets()).toHaveLength(0);
    expect(graphStore.hasRunningPackets()).toBe(false);
  });
});
