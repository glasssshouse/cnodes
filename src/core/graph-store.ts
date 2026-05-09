import type { CanvasConnectionDraft, CanvasNodeDraft } from '../types/internal';
import type {
  CanvasConnection,
  CanvasNode,
  CanvasPacket,
  CanvasPacketStyleOptions,
} from '../types/public';
import { findShortestConnectionPath, type PacketRouteSegment } from './pathfinding';

export type RenderPacket = Readonly<{
  id: string;
  progress: number;
  route: readonly PacketRouteSegment[];
  status: CanvasPacket['status'];
  style?: CanvasPacketStyleOptions;
}>;

export type PacketReceiveEvent = Readonly<{
  color?: string;
  nodeId: string;
}>;

type StoredPacket = {
  id: string;
  progress: number;
  reachedHopCount: number;
  route: PacketRouteSegment[];
  routeTargetNodeIds: string[];
  sourceNodeId: string;
  startedAt: number;
  status: CanvasPacket['status'];
  style?: CanvasPacketStyleOptions;
  targetNodeId: string;
};

type StoredNode = {
  color: string;
  description?: string;
  explicitId: boolean;
  height: number;
  id: string;
  kind: string;
  ports?: NonNullable<CanvasNode['ports']>;
  shape: CanvasNode['shape'];
  title: string;
  width: number;
  x: number;
  y: number;
};

export class GraphStore {
  readonly #connections: CanvasConnection[] = [];
  readonly #nodes: StoredNode[] = [];
  #connectionCount = 0;
  #nodeCount = 0;
  readonly #packets: StoredPacket[] = [];
  #packetCount = 0;

  addConnection(connection: CanvasConnectionDraft): CanvasConnection {
    const committedConnection: CanvasConnection = {
      ...connection,
      id: `connection-${++this.#connectionCount}`,
    };

    this.#connections.push(committedConnection);

    return committedConnection;
  }

  addNode(node: CanvasNodeDraft & { color: string }): CanvasNode {
    const explicitId = typeof node.id === 'string';
    const nodeId = node.id ?? `node-${++this.#nodeCount}`;

    if (this.#nodes.some((entry) => entry.id === nodeId)) {
      throw new Error(`Node id "${nodeId}" already exists in this graph.`);
    }

    const committedNode: StoredNode = {
      ...node,
      explicitId,
      id: nodeId,
    };

    this.#nodes.push(committedNode);

    return committedNode;
  }

  addPacket(
    sourceNodeId: string,
    targetNodeId: string,
    startedAt: number,
    route: PacketRouteSegment[],
    style?: CanvasPacketStyleOptions,
  ): CanvasPacket {
    const routeTargetNodeIds = route.map((segment) =>
      getSegmentTargetNodeId(this.#connections, segment) ?? targetNodeId,
    );
    const committedPacket: StoredPacket = {
      id: `packet-${++this.#packetCount}`,
      progress: 0,
      reachedHopCount: 0,
      route,
      routeTargetNodeIds,
      sourceNodeId,
      startedAt,
      status: 'running',
      ...(style ? { style: { ...style } } : {}),
      targetNodeId,
    };

    this.#packets.push(committedPacket);

    return committedPacket;
  }

  advancePackets(timestamp: number, durationMs: number): PacketReceiveEvent[] {
    const receiveEvents: PacketReceiveEvent[] = [];

    for (const packet of this.#packets) {
      if (packet.status !== 'running') {
        continue;
      }

      const hopCount = Math.max(packet.route.length, 1);
      const totalDurationMs = hopCount * durationMs;

      packet.progress = Math.min((timestamp - packet.startedAt) / totalDurationMs, 1);
      const reachedHopCount = Math.min(
        Math.floor(packet.progress * hopCount),
        hopCount,
      );

      if (packet.style?.receiveHighlight) {
        receiveEvents.push(
          ...getPacketReceiveEvents(packet, reachedHopCount),
        );
      }

      packet.reachedHopCount = Math.max(
        packet.reachedHopCount,
        reachedHopCount,
      );

      if (packet.progress >= 1) {
        packet.progress = 1;
        packet.status = 'completed';
      }
    }

    for (let index = this.#packets.length - 1; index >= 0; index -= 1) {
      const packet = this.#packets[index];

      if (packet?.status === 'completed') {
        this.#packets.splice(index, 1);
      }
    }

    return receiveEvents;
  }

  getConnections(): readonly CanvasConnection[] {
    return this.#connections;
  }

  getNodes(): readonly CanvasNode[] {
    return this.#nodes;
  }

  getNode(id: string): CanvasNode | null {
    return this.#nodes.find((node) => node.id === id) ?? null;
  }

  getRenderablePackets(): readonly RenderPacket[] {
    return this.#packets;
  }

  hasPersistentNodeId(id: string): boolean {
    return this.#nodes.some((node) => node.id === id && node.explicitId);
  }

  findShortestPath(
    sourceNodeId: string,
    targetNodeId: string,
  ): PacketRouteSegment[] | null {
    return findShortestConnectionPath(this.#connections, sourceNodeId, targetNodeId);
  }

  hasAnimatedConnections(): boolean {
    return this.#connections.some(
      (connection) =>
        connection.style.stroke === 'animated' ||
        connection.style.stroke === 'animated-dotted',
    );
  }

  hasRunningPackets(): boolean {
    return this.#packets.some((packet) => packet.status === 'running');
  }

  updateNodePosition(id: string, x: number, y: number): CanvasNode | null {
    const node = this.#nodes.find((entry) => entry.id === id);

    if (!node) {
      return null;
    }

    node.x = x;
    node.y = y;

    return node;
  }
}

function getPacketReceiveEvents(
  packet: StoredPacket,
  reachedHopCount: number,
): PacketReceiveEvent[] {
  if (reachedHopCount <= packet.reachedHopCount) {
    return [];
  }

  const receiveEvents: PacketReceiveEvent[] = [];
  const startHopIndex =
    packet.style?.receiveHighlight === 'target'
      ? packet.route.length - 1
      : packet.reachedHopCount;

  for (
    let hopIndex = Math.max(startHopIndex, packet.reachedHopCount);
    hopIndex < reachedHopCount;
    hopIndex += 1
  ) {
    const nodeId = packet.routeTargetNodeIds[hopIndex] ?? packet.targetNodeId;

    receiveEvents.push({
      ...(packet.style?.color ? { color: packet.style.color } : {}),
      nodeId,
    });
  }

  return receiveEvents;
}

function getSegmentTargetNodeId(
  connections: readonly CanvasConnection[],
  segment: PacketRouteSegment,
): string | null {
  const connection = connections.find((entry) => entry.id === segment.connectionId);

  if (!connection) {
    return null;
  }

  return segment.reversed ? connection.sourceNodeId : connection.targetNodeId;
}
