import { describe, expect, it } from 'vitest';

import type { CanvasNode } from '../../src/types/public';
import { NodeDragController } from '../../src/graph/node-drag-controller';

describe('NodeDragController', () => {
  it('returns updated coordinates for matching pointer moves', () => {
    const dragController = new NodeDragController();
    const source = createNode({
      id: 'source',
      x: 100,
      y: 120,
    });

    dragController.beginDrag(source, { x: 110, y: 135 }, { pointerId: 7 });

    expect(dragController.moveDrag({ x: 190, y: 215 }, { pointerId: 7 })).toEqual([
      {
        targetNodeId: 'source',
        x: 180,
        y: 200,
      },
    ]);
  });

  it('returns updated coordinates for every node in a drag group', () => {
    const dragController = new NodeDragController();
    const source = createNode({
      id: 'source',
      x: 100,
      y: 120,
    });
    const target = createNode({
      id: 'target',
      x: 280,
      y: 240,
    });

    dragController.beginDrag([source, target], { x: 110, y: 135 }, { pointerId: 7 });

    expect(dragController.moveDrag({ x: 190, y: 215 }, { pointerId: 7 })).toEqual([
      {
        targetNodeId: 'source',
        x: 180,
        y: 200,
      },
      {
        targetNodeId: 'target',
        x: 360,
        y: 320,
      },
    ]);
  });

  it('ignores pointer moves from a different pointer id', () => {
    const dragController = new NodeDragController();

    dragController.beginDrag(createNode({ id: 'source' }), { x: 100, y: 120 }, { pointerId: 7 });

    expect(dragController.moveDrag({ x: 180, y: 200 }, { pointerId: 8 })).toBeNull();
  });

  it('finishes the active drag only for the matching pointer id', () => {
    const dragController = new NodeDragController();

    dragController.beginDrag(createNode({ id: 'source' }), { x: 100, y: 120 }, { pointerId: 7 });

    expect(dragController.finishDrag({ pointerId: 8 })).toBeNull();
    expect(dragController.finishDrag({ pointerId: 7 })).toEqual(['source']);
    expect(dragController.isDragging).toBe(false);
  });
});

function createNode(overrides: Partial<CanvasNode>): CanvasNode {
  return {
    color: '#4f46e5',
    height: 60,
    id: 'node',
    kind: 'source',
    shape: 'rect',
    title: 'Source',
    width: 120,
    x: 100,
    y: 120,
    ...overrides,
  };
}
