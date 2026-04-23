import type { CanvasNode } from '../types/public';

type DragPoint = Readonly<{
  x: number;
  y: number;
}>;

type PointerLike = Readonly<{
  pointerId?: number;
}>;

type DragState = Readonly<{
  offsetX: number;
  offsetY: number;
  pointerId: number | null;
  targetNodeId: string;
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

  beginDrag(node: CanvasNode, point: DragPoint, event: PointerLike): void {
    this.#dragState = {
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      pointerId: readPointerId(event),
      targetNodeId: node.id,
    };
  }

  cancel(): void {
    this.#dragState = null;
  }

  finishDrag(event: PointerLike): string | null {
    if (!this.#dragState || !matchesPointer(this.#dragState.pointerId, event)) {
      return null;
    }

    const targetNodeId = this.#dragState.targetNodeId;

    this.#dragState = null;

    return targetNodeId;
  }

  moveDrag(point: DragPoint, event: PointerLike): DragMove | null {
    if (!this.#dragState || !matchesPointer(this.#dragState.pointerId, event)) {
      return null;
    }

    return {
      targetNodeId: this.#dragState.targetNodeId,
      x: point.x - this.#dragState.offsetX,
      y: point.y - this.#dragState.offsetY,
    };
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
