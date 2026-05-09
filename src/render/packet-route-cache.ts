import type { Point } from '../core/geometry';
import type { PacketRouteSegment } from '../core/pathfinding';
import type { CanvasNode } from '../types/public';
import type { ConnectionRenderModel } from './connection-render-model';
import { buildPacketRoutePoints } from './packet-route-points';

type CachedPacketRoute = Readonly<{
  routePoints: readonly Point[];
  signature: string;
}>;

export class PacketRouteCache {
  readonly #cache = new Map<string, CachedPacketRoute>();

  getRoutePoints(
    nodeById: ReadonlyMap<string, CanvasNode>,
    connectionRenderModelById: ReadonlyMap<string, ConnectionRenderModel>,
    route: readonly PacketRouteSegment[],
  ): readonly Point[] {
    if (route.length === 0) {
      return [];
    }

    const signature = getPacketRouteSignature(nodeById, connectionRenderModelById, route);

    if (!signature) {
      return [];
    }

    const cacheKey = route
      .map((segment) => `${segment.connectionId}:${segment.reversed ? 'reverse' : 'forward'}`)
      .join('|');
    const cachedRoute = this.#cache.get(cacheKey);

    if (cachedRoute && cachedRoute.signature === signature) {
      return cachedRoute.routePoints;
    }

    const routePoints = buildPacketRoutePoints(nodeById, connectionRenderModelById, route);

    this.#cache.set(cacheKey, {
      routePoints,
      signature,
    });

    return routePoints;
  }
}

function getPacketRouteSignature(
  nodeById: ReadonlyMap<string, CanvasNode>,
  connectionRenderModelById: ReadonlyMap<string, ConnectionRenderModel>,
  route: readonly PacketRouteSegment[],
): string | null {
  const signatureParts: string[] = [];

  for (const [index, segment] of route.entries()) {
    const renderModel = connectionRenderModelById.get(segment.connectionId);

    if (!renderModel) {
      return null;
    }

    signatureParts.push(
      `${segment.connectionId}:${segment.reversed ? 'reverse' : 'forward'}:${renderModel.signature}`,
    );

    if (index === 0) {
      continue;
    }

    const sourceNodeId = segment.reversed
      ? renderModel.targetNodeId
      : renderModel.sourceNodeId;
    const sourceNode = nodeById.get(sourceNodeId);

    if (!sourceNode) {
      return null;
    }

    signatureParts.push(`node:${sourceNodeId}:${sourceNode.x}|${sourceNode.y}`);
  }

  return signatureParts.join('||');
}
