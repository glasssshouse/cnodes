import type { CanvasNodeDraft } from '../types/internal';
import type {
  CanvasNode,
  CanvasNodePortOptions,
  CanvasShape,
} from '../types/public';

const DEFAULT_CIRCLE_SIZE = 48;
const DEFAULT_RECTANGLE_HEIGHT = 60;
const DEFAULT_RECTANGLE_WIDTH = 120;

type CommitNode = (node: CanvasNodeDraft) => CanvasNode;

type NodeBuilderOptions = {
  commitNode: CommitNode;
  kind: string;
};

export class NodeBuilder {
  readonly #commitNode: CommitNode;
  readonly #draft: CanvasNodeDraft;
  #hasExplicitSize = false;

  constructor(options: NodeBuilderOptions) {
    this.#commitNode = options.commitNode;
    this.#draft = {
      height: DEFAULT_RECTANGLE_HEIGHT,
      kind: options.kind,
      shape: 'rect',
      title: options.kind,
      width: DEFAULT_RECTANGLE_WIDTH,
      x: 0,
      y: 0,
    };
  }

  at(x: number, y: number): this {
    this.#draft.x = x;
    this.#draft.y = y;

    return this;
  }

  color(color: string): this {
    this.#draft.color = color;

    return this;
  }

  id(id: string): this {
    this.#draft.id = id;

    return this;
  }

  port(id: string, options: CanvasNodePortOptions): this {
    const normalizedId = normalizePortId(id);

    if (!normalizedId) {
      throw new Error('Node port id must be a non-empty string.');
    }

    const ports = this.#draft.ports ?? [];

    if (ports.some((port) => port.id === normalizedId)) {
      throw new Error(`Node port id "${normalizedId}" is already defined.`);
    }

    this.#draft.ports = [
      ...ports,
      {
        id: normalizedId,
        side: options.side,
      },
    ];

    return this;
  }

  description(description: string): this {
    this.#draft.description = description;

    return this;
  }

  title(title: string): this {
    this.#draft.title = title;

    return this;
  }

  shape(shape: CanvasShape): this {
    this.#draft.shape = shape;

    if (!this.#hasExplicitSize) {
      const defaultSize = getDefaultNodeSize(shape);

      this.#draft.width = defaultSize.width;
      this.#draft.height = defaultSize.height;
    }

    return this;
  }

  size(width: number, height: number): this {
    this.#hasExplicitSize = true;
    this.#draft.width = width;
    this.#draft.height = height;

    return this;
  }

  done(): CanvasNode {
    return this.#commitNode(this.#draft);
  }
}

export type { CanvasShape };

function getDefaultNodeSize(
  shape: CanvasShape,
): Pick<CanvasNodeDraft, 'height' | 'width'> {
  if (shape === 'circle') {
    return {
      height: DEFAULT_CIRCLE_SIZE,
      width: DEFAULT_CIRCLE_SIZE,
    };
  }

  return {
    height: DEFAULT_RECTANGLE_HEIGHT,
    width: DEFAULT_RECTANGLE_WIDTH,
  };
}

function normalizePortId(id: string): string | undefined {
  const normalizedId = id.trim();

  return normalizedId ? normalizedId : undefined;
}
