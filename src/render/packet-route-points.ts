import type { Point } from '../core/geometry';
import type { CanvasNode } from '../types/public';
import type { ConnectionRenderModel } from './connection-render-model';

export function buildPacketRoutePoints(
  nodeById: ReadonlyMap<string, CanvasNode>,
  connectionRenderModelById: ReadonlyMap<string, ConnectionRenderModel>,
  connectionIds: readonly string[],
): Point[] {
  if (connectionIds.length === 0) {
    return [];
  }

  const routePoints: Point[] = [];

  for (const [index, connectionId] of connectionIds.entries()) {
    const renderModel = connectionRenderModelById.get(connectionId);

    if (!renderModel) {
      return [];
    }

    const sourceNode = nodeById.get(renderModel.sourceNodeId);

    if (!sourceNode) {
      return [];
    }

    if (index === 0) {
      routePoints.push(...renderModel.routePoints);
      continue;
    }

    routePoints.push(
      { x: sourceNode.x, y: sourceNode.y },
      renderModel.visiblePath.start,
      ...renderModel.routePoints.slice(1),
    );
  }

  return routePoints;
}
