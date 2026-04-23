import type { CanvasConnection } from '../types/public';

export function findShortestConnectionPath(
  connections: readonly CanvasConnection[],
  sourceNodeId: string,
  targetNodeId: string,
): string[] | null {
  if (sourceNodeId === targetNodeId) {
    return [];
  }

  const queue: Array<{ connectionIds: string[]; nodeId: string }> = [{
    connectionIds: [],
    nodeId: sourceNodeId,
  }];
  const visited = new Set([sourceNodeId]);

  while (queue.length > 0) {
    const entry = queue.shift();

    if (!entry) {
      break;
    }

    for (const connection of connections) {
      if (connection.sourceNodeId !== entry.nodeId) {
        continue;
      }

      const nextNodeId = connection.targetNodeId;

      if (visited.has(nextNodeId)) {
        continue;
      }

      const nextConnectionIds = [...entry.connectionIds, connection.id];

      if (nextNodeId === targetNodeId) {
        return nextConnectionIds;
      }

      visited.add(nextNodeId);
      queue.push({
        connectionIds: nextConnectionIds,
        nodeId: nextNodeId,
      });
    }
  }

  return null;
}
