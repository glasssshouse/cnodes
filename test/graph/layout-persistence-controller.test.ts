import { describe, expect, it, vi } from 'vitest';

import type { CanvasNode, StorageLike } from '../../src/types/public';
import {
  LayoutPersistenceController,
  resolveLayoutPersistence,
} from '../../src/graph/layout-persistence-controller';

describe('LayoutPersistenceController', () => {
  it('loads persisted coordinates only for explicit persistent ids', () => {
    const storage = createStorage({
      'cnodes:layout:app': JSON.stringify({
        source: { x: 260, y: 210 },
      }),
    });
    const persistence = new LayoutPersistenceController({
      key: 'cnodes:layout:app',
      storage,
    });

    expect(persistence.loadNodePosition('source', true)).toEqual({ x: 260, y: 210 });
    expect(persistence.loadNodePosition('source', false)).toBeNull();
  });

  it('persists node coordinates only when the node uses a persistent id', () => {
    const storage = createStorage();
    const persistence = new LayoutPersistenceController({
      key: 'cnodes:layout:app',
      storage,
    });
    const source = createNode({ id: 'source', x: 180, y: 200 });

    persistence.persistNode(source, true);
    persistence.persistNode(createNode({ id: 'node-1', x: 300, y: 320 }), false);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.getItem('cnodes:layout:app')).toBe(JSON.stringify({
      source: { x: 180, y: 200 },
    }));
  });

  it('resolves constructor persistence options into a storage-backed controller', () => {
    const storage = createStorage();
    const target = document.createElement('div');

    target.id = 'app';

    expect(resolveLayoutPersistence({
      layoutPersistence: {
        enabled: true,
        storage,
      },
    }, target)).toBeInstanceOf(LayoutPersistenceController);
    expect(resolveLayoutPersistence({}, target)).toBeNull();
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

function createStorage(seed: Record<string, string> = {}): StorageLike & {
  setItem: ReturnType<typeof vi.fn>;
} {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
}
