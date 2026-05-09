import type { CanvasNode } from '../types/public';

type DragPoint = Readonly<{
  x: number;
  y: number;
}>;

type PointerLike = Readonly<{
  pointerId?: number;
}>;

type DragState = Readonly<{
  nodes: readonly DragNodeState[];
  pointerId: number | null;
  startPoint: DragPoint;
  targetNodeId: string;
}>;

type DragNodeState = Readonly<{
  targetNodeId: string;
  x: number;
  y: number;
}>;

export type DragMove = Readonly<{
  targetNodeId: string;
  x: number;
  y: number;
}>;

export class NodeDragController {
  #dragState: DragState | null = null;

  get activeNodeId(): string | null {
    return this.#dragState?.targetNodeId ?? null;
  }

  get isDragging(): boolean {
    return this.#dragState !== null;
  }

  beginDrag(
    nodeOrNodes: CanvasNode | readonly CanvasNode[],
    point: DragPoint,
    event: PointerLike,
  ): void {
    const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
    const targetNode = nodes[0];

    if (!targetNode) {
      this.#dragState = null;
      return;
    }

    this.#dragState = {
      nodes: nodes.map((node) => ({
        targetNodeId: node.id,
        x: node.x,
        y: node.y,
      })),
      pointerId: readPointerId(event),
      startPoint: point,
      targetNodeId: targetNode.id,
    };
  }

  cancel(): void {
    this.#dragState = null;
  }

  finishDrag(event: PointerLike): readonly string[] | null {
    if (!this.#dragState || !matchesPointer(this.#dragState.pointerId, event)) {
      return null;
    }

    const targetNodeIds = this.#dragState.nodes.map((node) => node.targetNodeId);

    this.#dragState = null;

    return targetNodeIds;
  }

  moveDrag(point: DragPoint, event: PointerLike): readonly DragMove[] | null {
    if (!this.#dragState || !matchesPointer(this.#dragState.pointerId, event)) {
      return null;
    }

    const deltaX = point.x - this.#dragState.startPoint.x;
    const deltaY = point.y - this.#dragState.startPoint.y;

    return this.#dragState.nodes.map((node) => ({
      targetNodeId: node.targetNodeId,
      x: node.x + deltaX,
      y: node.y + deltaY,
    }));
  }
}

function matchesPointer(pointerId: number | null, event: PointerLike): boolean {
  if (pointerId === null) {
    return true;
  }

  return readPointerId(event) === pointerId;
}

function readPointerId(event: PointerLike): number | null {
  return typeof event.pointerId === 'number' ? event.pointerId : null;
}
