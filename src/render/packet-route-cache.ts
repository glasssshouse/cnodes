import type { Point } from '../core/geometry';
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
    connectionIds: readonly string[],
  ): readonly Point[] {
    if (connectionIds.length === 0) {
      return [];
    }

    const signature = getPacketRouteSignature(nodeById, connectionRenderModelById, connectionIds);

    if (!signature) {
      return [];
    }

    const cacheKey = connectionIds.join('|');
    const cachedRoute = this.#cache.get(cacheKey);

    if (cachedRoute && cachedRoute.signature === signature) {
      return cachedRoute.routePoints;
    }

    const routePoints = buildPacketRoutePoints(nodeById, connectionRenderModelById, connectionIds);

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
  connectionIds: readonly string[],
): string | null {
  const signatureParts: string[] = [];

  for (const [index, connectionId] of connectionIds.entries()) {
    const renderModel = connectionRenderModelById.get(connectionId);

    if (!renderModel) {
      return null;
    }

    signatureParts.push(`${connectionId}:${renderModel.signature}`);

    if (index === 0) {
      continue;
    }

    const sourceNode = nodeById.get(renderModel.sourceNodeId);

    if (!sourceNode) {
      return null;
    }

    signatureParts.push(`node:${renderModel.sourceNodeId}:${sourceNode.x}|${sourceNode.y}`);
  }

  return signatureParts.join('||');
}
