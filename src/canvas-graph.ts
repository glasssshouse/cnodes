import { isPointInsideNode } from './core/geometry';
import { GraphStore, type PacketReceiveEvent } from './core/graph-store';
import { NodeBuilder } from './fluent/node-builder';
import { AnimationController } from './graph/animation-controller';
import { CanvasSurface } from './graph/canvas-surface';
import { resolveLayoutPersistence } from './graph/layout-persistence-controller';
import type { LayoutPersistenceController } from './graph/layout-persistence-controller';
import { NodeDragController } from './graph/node-drag-controller';
import { getRequiredNodeHeight } from './layout/text-layout';
import { CanvasRenderer } from './render/canvas-renderer';
import type { NodeHighlight } from './render/canvas-renderer';
import { resolveCanvasTheme } from './theme/canvas-theme';
import type { CanvasConnectionDraft, CanvasNodeDraft } from './types/internal';
import type {
  CanvasConnectionOptions,
  CanvasConnectionStyle,
  CanvasConnection,
  CanvasGraphAction,
  CanvasGraphActionResult,
  CanvasGraphOptions,
  CanvasNode,
  CanvasNodeRef,
  CanvasPacket,
  CanvasPacketSendOptions,
  CanvasRenderStatsSample,
} from './types/public';

const DASH_OFFSET_SPEED = 0.05;
const PACKET_DURATION_MS = 900;
const NODE_RECEIVE_HIGHLIGHT_DURATION_MS = 520;

type StoredNodeHighlight = Readonly<{
  color: string;
  expiresAt: number;
  startedAt: number;
}>;

export class CanvasGraph {
  readonly #animationController: AnimationController;
  readonly #canvasSurface: CanvasSurface;
  #connectionDashOffset = 0;
  #currentAnimationTimestamp = 0;
  readonly #defaultConnectionStyle: CanvasConnectionStyle;
  #destroyed = false;
  readonly #dragController = new NodeDragController();
  readonly #graphStore = new GraphStore();
  #hoveredNodeId: string | null = null;
  readonly #nodeHighlights = new Map<string, StoredNodeHighlight>();
  readonly #layoutPersistence: LayoutPersistenceController | null;
  readonly #onRenderStats: ((sample: CanvasRenderStatsSample) => void) | null;
  readonly #renderer: CanvasRenderer;
  readonly #teardownResizeObservation: () => void;
  readonly #theme = resolveCanvasTheme({});

  constructor(target: string | HTMLElement, options: CanvasGraphOptions = {}) {
    this.#canvasSurface = new CanvasSurface(target);
    this.#canvasSurface.syncSize(true);
    this.#theme = resolveCanvasTheme(options);
    this.#defaultConnectionStyle = resolveDefaultConnectionStyle(
      options,
      this.#theme.tokens.connectionDefaultColor,
    );
    this.#layoutPersistence = resolveLayoutPersistence(
      options,
      this.#canvasSurface.target,
    );
    this.#onRenderStats = options.debug?.onRenderStats ?? null;
    this.#renderer = new CanvasRenderer({
      context: this.#canvasSurface.context,
      height: this.#canvasSurface.height,
      packet: resolvePacketRenderOptions(options),
      portsVisible: options.ports?.visible ?? false,
      theme: this.#theme,
      width: this.#canvasSurface.width,
    });
    this.#animationController = new AnimationController({
      onFrame: (timestamp) => {
        this.#tickAnimation(timestamp);
      },
      shouldAnimate: () => this.#shouldAnimate(),
    });
    this.#bindInteractionEvents();
    this.#teardownResizeObservation = this.#canvasSurface.bindResizeObservation(
      this.#handleResize,
    );
  }

  // Public API

  createNode(kind: string): NodeBuilder {
    return new NodeBuilder({
      commitNode: (draft) => this.#commitNode(draft),
      kind,
    });
  }

  connect(
    source: CanvasNodeRef,
    target: CanvasNodeRef,
    options: CanvasConnectionOptions = {},
  ): CanvasConnection {
    const sourceNode = this.#requireNode(source, 'Source');
    const targetNode = this.#requireNode(target, 'Target');

    if (sourceNode.id === targetNode.id) {
      throw new Error('Self-connections are not supported yet.');
    }

    const label = normalizeConnectionLabel(options.label);

    return this.#commitConnection({
      ...(label ? { label } : {}),
      sourceNodeId: sourceNode.id,
      style: resolveConnectionStyle(this.#defaultConnectionStyle, options),
      targetNodeId: targetNode.id,
    });
  }

  send(
    source: CanvasNodeRef,
    target: CanvasNodeRef,
    options: CanvasPacketSendOptions = {},
  ): CanvasPacket {
    const sourceNode = this.#requireNode(source, 'Source');
    const targetNode = this.#requireNode(target, 'Target');
    const waypointNodes =
      options.via?.map((nodeRef) => this.#requireNode(nodeRef, 'Waypoint')) ??
      [];
    const connectionIds = this.#resolvePacketConnectionIds(
      sourceNode,
      targetNode,
      waypointNodes,
    );

    const packet = this.#graphStore.addPacket(
      sourceNode.id,
      targetNode.id,
      performance.now(),
      connectionIds,
      options.packet,
    );

    this.#render();
    this.#animationController.ensureRunning();

    return packet;
  }

  dispatch(action: CanvasGraphAction): CanvasGraphActionResult {
    try {
      switch (action.type) {
        case 'packet:send':
          return {
            ok: true,
            packet: this.send(
              action.sourceNodeId,
              action.targetNodeId,
              resolveActionSendOptions(action),
            ),
          };
        default:
          return {
            error: new Error(
              `Unsupported graph action "${String(action.type)}".`,
            ),
            ok: false,
          };
      }
    } catch (error) {
      return {
        error: normalizeDispatchError(error),
        ok: false,
      };
    }
  }

  destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#animationController.stop();
    this.#teardownResizeObservation();
    window.removeEventListener('pointermove', this.#handlePointerMove);
    window.removeEventListener('pointerup', this.#handlePointerUp);
    window.removeEventListener('pointercancel', this.#handlePointerUp);
    this.#canvasSurface.canvas.removeEventListener(
      'pointerdown',
      this.#handlePointerDown,
    );
    this.#canvasSurface.canvas.removeEventListener(
      'pointerleave',
      this.#handlePointerLeave,
    );
    this.#canvasSurface.canvas.removeEventListener(
      'pointermove',
      this.#handlePointerHover,
    );
    this.#dragController.cancel();
  }

  // Render and animation

  #commitConnection(connection: CanvasConnectionDraft): CanvasConnection {
    const committedConnection = this.#graphStore.addConnection(connection);

    this.#render();
    this.#animationController.ensureRunning();

    return committedConnection;
  }

  #commitNode(node: CanvasNodeDraft): CanvasNode {
    const committedNode = this.#graphStore.addNode({
      color: node.color ?? this.#theme.tokens.nodeFill,
      ...node,
      height: getRequiredNodeHeight(this.#canvasSurface.context, node),
    });
    const persistedPosition =
      this.#layoutPersistence?.loadNodePosition(
        committedNode.id,
        this.#graphStore.hasPersistentNodeId(committedNode.id),
      ) ?? null;

    if (persistedPosition) {
      this.#graphStore.updateNodePosition(
        committedNode.id,
        persistedPosition.x,
        persistedPosition.y,
      );
    }

    this.#render();

    return committedNode;
  }

  #bindInteractionEvents(): void {
    this.#canvasSurface.canvas.addEventListener(
      'pointerdown',
      this.#handlePointerDown,
    );
    this.#canvasSurface.canvas.addEventListener(
      'pointerleave',
      this.#handlePointerLeave,
    );
    this.#canvasSurface.canvas.addEventListener(
      'pointermove',
      this.#handlePointerHover,
    );
  }

  #render(): void {
    if (this.#destroyed) {
      return;
    }

    const nodes = this.#graphStore.getNodes();
    const connections = this.#graphStore.getConnections();
    const packets = this.#graphStore.getRenderablePackets();
    const renderStartedAt = performance.now();

    const renderTimestamp = this.#currentAnimationTimestamp || performance.now();

    this.#renderer.render(nodes, connections, packets, {
      connectionDashOffset: this.#connectionDashOffset,
      hoveredNodeId: this.#hoveredNodeId,
      nodeHighlights: this.#getRenderableNodeHighlights(renderTimestamp),
    });
    this.#onRenderStats?.({
      animatedConnections: this.#graphStore.hasAnimatedConnections(),
      cause: this.#resolveRenderCause(),
      connectionCount: connections.length,
      dragging: this.#dragController.isDragging,
      packetsActive: this.#graphStore.hasRunningPackets(),
      packetsCount: packets.length,
      renderDurationMs: Math.max(performance.now() - renderStartedAt, 0),
      timestamp: performance.now(),
    });
  }

  #tickAnimation(timestamp: number): void {
    if (this.#destroyed) {
      return;
    }
    this.#currentAnimationTimestamp = timestamp;
    this.#connectionDashOffset = -(timestamp * DASH_OFFSET_SPEED);

    if (this.#graphStore.hasRunningPackets()) {
      this.#registerPacketReceiveHighlights(
        this.#graphStore.advancePackets(timestamp, PACKET_DURATION_MS),
        timestamp,
      );
    }

    this.#render();
  }

  #shouldAnimate(): boolean {
    return (
      this.#dragController.isDragging ||
      this.#graphStore.hasRunningPackets() ||
      this.#graphStore.hasAnimatedConnections() ||
      this.#nodeHighlights.size > 0
    );
  }

  #resolveRenderCause():
    | 'connection-animation'
    | 'drag'
    | 'packets'
    | 'static' {
    if (this.#dragController.isDragging) {
      return 'drag';
    }

    if (this.#graphStore.hasRunningPackets()) {
      return 'packets';
    }

    if (this.#graphStore.hasAnimatedConnections()) {
      return 'connection-animation';
    }

    return 'static';
  }

  #registerPacketReceiveHighlights(
    events: readonly PacketReceiveEvent[],
    timestamp: number,
  ): void {
    for (const event of events) {
      this.#nodeHighlights.set(event.nodeId, {
        color: event.color ?? this.#theme.tokens.packetColor,
        expiresAt: timestamp + NODE_RECEIVE_HIGHLIGHT_DURATION_MS,
        startedAt: timestamp,
      });
    }
  }

  #getRenderableNodeHighlights(timestamp: number): readonly NodeHighlight[] {
    const highlights: NodeHighlight[] = [];

    for (const [nodeId, highlight] of this.#nodeHighlights) {
      if (timestamp >= highlight.expiresAt) {
        this.#nodeHighlights.delete(nodeId);
        continue;
      }

      highlights.push({
        color: highlight.color,
        nodeId,
        progress:
          (timestamp - highlight.startedAt) /
          NODE_RECEIVE_HIGHLIGHT_DURATION_MS,
      });
    }

    return highlights;
  }

  // Pointer interaction

  readonly #handlePointerDown = (event: PointerEvent): void => {
    const point = this.#canvasSurface.getPointerPosition(event);
    const targetNode = this.#findNodeAtPoint(point.x, point.y);

    if (!targetNode) {
      this.#dragController.cancel();
      return;
    }

    const shouldRender = this.#hoveredNodeId !== targetNode.id;

    this.#hoveredNodeId = targetNode.id;
    this.#dragController.beginDrag(targetNode, point, event);

    window.addEventListener('pointermove', this.#handlePointerMove);
    window.addEventListener('pointerup', this.#handlePointerUp);
    window.addEventListener('pointercancel', this.#handlePointerUp);

    if (shouldRender) {
      this.#render();
    }
  };

  readonly #handlePointerMove = (event: PointerEvent): void => {
    const point = this.#canvasSurface.getPointerPosition(event);
    const positionUpdate = this.#dragController.moveDrag(point, event);

    if (!positionUpdate) {
      return;
    }

    this.#graphStore.updateNodePosition(
      positionUpdate.targetNodeId,
      positionUpdate.x,
      positionUpdate.y,
    );
    this.#hoveredNodeId = positionUpdate.targetNodeId;
    this.#animationController.ensureRunning();
  };

  readonly #handlePointerUp = (event: PointerEvent): void => {
    const draggedNodeId = this.#dragController.finishDrag(event);

    if (!draggedNodeId) {
      return;
    }

    this.#layoutPersistence?.persistNode(
      this.#graphStore.getNode(draggedNodeId),
      this.#graphStore.hasPersistentNodeId(draggedNodeId),
    );
    window.removeEventListener('pointermove', this.#handlePointerMove);
    window.removeEventListener('pointerup', this.#handlePointerUp);
    window.removeEventListener('pointercancel', this.#handlePointerUp);
  };

  readonly #handleResize = (): void => {
    if (this.#destroyed) {
      return;
    }

    if (this.#canvasSurface.syncSize()) {
      this.#renderer.resize(
        this.#canvasSurface.width,
        this.#canvasSurface.height,
      );
      this.#render();
    }
  };

  readonly #handlePointerHover = (event: PointerEvent): void => {
    if (this.#dragController.isDragging) {
      return;
    }

    const point = this.#canvasSurface.getPointerPosition(event);
    const hoveredNode = this.#findNodeAtPoint(point.x, point.y);
    const nextHoveredNodeId = hoveredNode?.id ?? null;

    if (this.#hoveredNodeId === nextHoveredNodeId) {
      return;
    }

    this.#hoveredNodeId = nextHoveredNodeId;
    this.#render();
  };

  readonly #handlePointerLeave = (): void => {
    if (this.#dragController.isDragging || this.#hoveredNodeId === null) {
      return;
    }

    this.#hoveredNodeId = null;
    this.#render();
  };

  // Packet-route resolution

  #findNodeAtPoint(x: number, y: number): CanvasNode | null {
    const nodes = this.#graphStore.getNodes();

    return (
      [...nodes].reverse().find((node) => isPointInsideNode(node, x, y)) ?? null
    );
  }

  #resolvePacketConnectionIds(
    sourceNode: CanvasNode,
    targetNode: CanvasNode,
    waypointNodes: readonly CanvasNode[],
  ): string[] {
    if (waypointNodes.length === 0) {
      const connectionIds = this.#graphStore.findShortestPath(
        sourceNode.id,
        targetNode.id,
      );

      if (!connectionIds) {
        throw new Error(
          `No path exists from "${sourceNode.id}" to "${targetNode.id}".`,
        );
      }

      return connectionIds;
    }

    const routeNodes = [sourceNode, ...waypointNodes, targetNode];
    const connectionIds: string[] = [];

    for (let index = 0; index < routeNodes.length - 1; index += 1) {
      const segmentSource = routeNodes[index];
      const segmentTarget = routeNodes[index + 1];

      if (!segmentSource || !segmentTarget) {
        continue;
      }

      const segmentConnectionIds = this.#graphStore.findShortestPath(
        segmentSource.id,
        segmentTarget.id,
      );

      if (!segmentConnectionIds) {
        throw new Error(
          `No path exists from "${segmentSource.id}" to "${segmentTarget.id}" while resolving packet route.`,
        );
      }

      connectionIds.push(...segmentConnectionIds);
    }

    return connectionIds;
  }

  #requireNode(nodeRef: CanvasNodeRef, label: string): CanvasNode {
    const nodeId = typeof nodeRef === 'string' ? nodeRef : nodeRef.id;
    const node = this.#graphStore.getNode(nodeId);

    if (!node) {
      throw new Error(`${label} node "${nodeId}" is not part of this graph.`);
    }

    return node;
  }
}

function resolveDefaultConnectionStyle(
  options: CanvasGraphOptions,
  defaultConnectionColor: string,
): CanvasConnectionStyle {
  return {
    arrow: options.connection?.arrow ?? 'end',
    color: options.connection?.color ?? defaultConnectionColor,
    line: options.connection?.line ?? 'straight',
    stroke: options.connection?.stroke ?? 'solid',
  };
}

function resolveConnectionStyle(
  defaults: CanvasConnectionStyle,
  options: CanvasConnectionOptions,
): CanvasConnectionStyle {
  return {
    arrow: options.style?.arrow ?? defaults.arrow,
    color: options.style?.color ?? defaults.color,
    line: options.style?.line ?? defaults.line,
    stroke: options.style?.stroke ?? defaults.stroke,
  };
}

function normalizeConnectionLabel(
  label: string | undefined,
): string | undefined {
  const normalizedLabel = label?.trim();

  return normalizedLabel ? normalizedLabel : undefined;
}

function resolveActionSendOptions(
  action: CanvasGraphAction,
): CanvasPacketSendOptions {
  return {
    ...(action.packet ? { packet: action.packet } : {}),
    ...(action.viaNodeIds ? { via: action.viaNodeIds } : {}),
  };
}

function normalizeDispatchError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function resolvePacketRenderOptions(options: CanvasGraphOptions): {
  radius: number;
  trail: boolean;
  trailLength: number;
} {
  return {
    radius: options.packet?.radius ?? 6,
    trail: options.packet?.trail ?? false,
    trailLength: options.packet?.trailLength ?? 28,
  };
}
