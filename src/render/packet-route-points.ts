import type { Point } from '../core/geometry';
import type { PacketRouteSegment } from '../core/pathfinding';
import type { CanvasNode } from '../types/public';
import type { ConnectionRenderModel } from './connection-render-model';

export function buildPacketRoutePoints(
  nodeById: ReadonlyMap<string, CanvasNode>,
  connectionRenderModelById: ReadonlyMap<string, ConnectionRenderModel>,
  route: readonly PacketRouteSegment[],
): Point[] {
  if (route.length === 0) {
    return [];
  }

  const routePoints: Point[] = [];

  for (const [index, segment] of route.entries()) {
    const renderModel = connectionRenderModelById.get(segment.connectionId);

    if (!renderModel) {
      return [];
    }

    const sourceNode = nodeById.get(
      segment.reversed ? renderModel.targetNodeId : renderModel.sourceNodeId,
    );

    if (!sourceNode) {
      return [];
    }

    const segmentRoutePoints = segment.reversed
      ? [...renderModel.routePoints].reverse()
      : renderModel.routePoints;
    const segmentStart = segment.reversed
      ? renderModel.visiblePath.end
      : renderModel.visiblePath.start;

    if (index === 0) {
      routePoints.push(...segmentRoutePoints);
      continue;
    }

    routePoints.push(
      { x: sourceNode.x, y: sourceNode.y },
      segmentStart,
      ...segmentRoutePoints.slice(1),
    );
  }

  return routePoints;
}
