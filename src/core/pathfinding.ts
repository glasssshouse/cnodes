import type { CanvasConnection } from '../types/public';

export type PacketRouteSegment = Readonly<{
  connectionId: string;
  reversed: boolean;
}>;

export function findShortestConnectionPath(
  connections: readonly CanvasConnection[],
  sourceNodeId: string,
  targetNodeId: string,
): PacketRouteSegment[] | null {
  if (sourceNodeId === targetNodeId) {
    return [];
  }

  const queue: Array<{ nodeId: string; route: PacketRouteSegment[] }> = [{
    nodeId: sourceNodeId,
    route: [],
  }];
  const visited = new Set([sourceNodeId]);

  while (queue.length > 0) {
    const entry = queue.shift();

    if (!entry) {
      break;
    }

    for (const edge of getConnectionEdges(connections, entry.nodeId)) {
      const nextNodeId = edge.nodeId;

      if (visited.has(nextNodeId)) {
        continue;
      }

      const nextRoute = [...entry.route, edge.segment];

      if (nextNodeId === targetNodeId) {
        return nextRoute;
      }

      visited.add(nextNodeId);
      queue.push({
        nodeId: nextNodeId,
        route: nextRoute,
      });
    }
  }

  return null;
}

function getConnectionEdges(
  connections: readonly CanvasConnection[],
  nodeId: string,
): Array<{ nodeId: string; segment: PacketRouteSegment }> {
  const edges: Array<{ nodeId: string; segment: PacketRouteSegment }> = [];

  for (const connection of connections) {
    if (connection.sourceNodeId === nodeId) {
      edges.push({
        nodeId: connection.targetNodeId,
        segment: {
          connectionId: connection.id,
          reversed: false,
        },
      });
    }

    if (connection.travel === 'both' && connection.targetNodeId === nodeId) {
      edges.push({
        nodeId: connection.sourceNodeId,
        segment: {
          connectionId: connection.id,
          reversed: true,
        },
      });
    }
  }

  return edges;
}
