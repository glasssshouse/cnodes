import {
  loadPersistedNodePosition,
  persistNodePosition,
} from '../layout/persistence';
import type {
  CanvasGraphOptions,
  CanvasNode,
  StorageLike,
} from '../types/public';

type LayoutPersistenceConfig = Readonly<{
  key: string;
  storage: StorageLike;
}>;

export class LayoutPersistenceController {
  readonly #key: string;
  readonly #storage: StorageLike;

  constructor(config: LayoutPersistenceConfig) {
    this.#key = config.key;
    this.#storage = config.storage;
  }

  loadNodePosition(nodeId: string, isPersistentNodeId: boolean): { x: number; y: number } | null {
    if (!isPersistentNodeId) {
      return null;
    }

    return loadPersistedNodePosition(
      this.#storage,
      this.#key,
      nodeId,
    );
  }

  persistNode(node: CanvasNode | null, isPersistentNodeId: boolean): void {
    if (!node || !isPersistentNodeId) {
      return;
    }

    persistNodePosition(this.#storage, this.#key, node);
  }
}

export function resolveLayoutPersistence(
  options: CanvasGraphOptions,
  target: HTMLElement,
): LayoutPersistenceController | null {
  const persistence = options.layoutPersistence;

  if (!persistence?.enabled || !persistence.storage) {
    return null;
  }

  return new LayoutPersistenceController({
    key: persistence.key ?? resolveLayoutPersistenceKey(target),
    storage: persistence.storage,
  });
}

function resolveLayoutPersistenceKey(target: HTMLElement): string {
  return target.id.length > 0 ? `cnodes:layout:${target.id}` : 'cnodes:layout';
}
