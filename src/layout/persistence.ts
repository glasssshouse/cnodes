import type { CanvasNode, StorageLike } from '../types/public';

type PersistedLayout = Record<string, PersistedNodePosition>;

type PersistedNodePosition = {
  x: number;
  y: number;
};

export function loadPersistedNodePosition(
  storage: StorageLike,
  key: string,
  nodeId: string,
): PersistedNodePosition | null {
  const layout = readLayout(storage, key);

  if (!layout) {
    return null;
  }

  const position = layout[nodeId];

  return isPersistedNodePosition(position) ? position : null;
}

export function persistNodePosition(storage: StorageLike, key: string, node: CanvasNode): void {
  const layout = readLayout(storage, key) ?? {};

  layout[node.id] = {
    x: node.x,
    y: node.y,
  };

  writeLayout(storage, key, layout);
}

function isPersistedNodePosition(value: unknown): value is PersistedNodePosition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PersistedNodePosition>;

  return Number.isFinite(candidate.x) && Number.isFinite(candidate.y);
}

function readLayout(storage: StorageLike, key: string): PersistedLayout | null {
  try {
    const rawValue = storage.getItem(key);

    if (!rawValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue as PersistedLayout;
  } catch {
    return null;
  }
}

function writeLayout(storage: StorageLike, key: string, layout: PersistedLayout): void {
  try {
    storage.setItem(key, JSON.stringify(layout));
  } catch {
    // Persistence is best-effort and should not break rendering or interaction.
  }
}
