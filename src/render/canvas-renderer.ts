import type { RenderPacket } from '../core/graph-store';
import { NODE_PORT_RADIUS, NODE_RECTANGLE_RADIUS, type Point } from '../core/geometry';
import {
  getDescriptionFont,
  getDescriptionLineHeight,
  getTitleFont,
  getTitleLineHeight,
} from '../layout/text-layout';
import {
  ConnectionRenderCache,
  drawConnectionPath,
  interpolatePointOnPolyline,
  resolveArrowheads,
  type ArrowheadSpec,
  type ConnectionRenderModel,
} from './connection-render-model';
import { PacketRouteCache } from './packet-route-cache';
import { getPolylineSegmentBeforeProgress } from './polyline-segment';
import { resolveConnectionStroke } from './connection-stroke';
import { TextLineCache } from './text-line-cache';
import type { ResolvedCanvasTheme } from '../theme/canvas-theme';
import type {
  CanvasConnection,
  CanvasNode,
} from '../types/public';

const ARROWHEAD_LENGTH = 14;
const ARROWHEAD_NODE_CLEARANCE = 2;
const ARROWHEAD_SPREAD = 8;
const CONNECTION_LINE_WIDTH = 2;
const CONNECTION_LABEL_BORDER_WIDTH = 1;
const CONNECTION_LABEL_FONT = '600 12px sans-serif';
const CONNECTION_LABEL_HEIGHT = 24;
const CONNECTION_LABEL_PADDING_X = 10;
const CONNECTION_LABEL_RADIUS = 10;
const FULL_CIRCLE_RADIANS = Math.PI * 2;
const NODE_BORDER_WIDTH = 1.5;
const NODE_HOVER_BORDER_WIDTH = 2.5;
const NODE_HIGHLIGHT_LINE_WIDTH = 4;
const NODE_HIGHLIGHT_SHADOW_BLUR = 26;
const NODE_SHADOW_BLUR = 18;
const NODE_HOVER_SHADOW_BLUR = 22;
const NODE_SHADOW_OFFSET_Y = 8;
const NODE_TEXT_GAP = 12;
const PORT_BORDER_WIDTH = 1.5;

export type PacketRenderOptions = Readonly<{
  radius: number;
  trail: boolean;
  trailLength: number;
}>;

type CanvasRendererOptions = {
  context: CanvasRenderingContext2D;
  height: number;
  packet: PacketRenderOptions;
  portsVisible: boolean;
  theme: ResolvedCanvasTheme;
  width: number;
};

type RenderInteractionState = {
  connectionDashOffset: number;
  hoveredNodeId: string | null;
  nodeHighlights: readonly NodeHighlight[];
};

type ConnectionLabelSpec = Readonly<{
  point: Point;
  text: string;
}>;

type ResolvedPacketRenderOptions = Readonly<{
  color: string;
  radius: number;
  trail: boolean;
  trailColor: string;
  trailLength: number;
}>;

export type NodeHighlight = Readonly<{
  color: string;
  nodeId: string;
  progress: number;
}>;

export class CanvasRenderer {
  readonly #connectionRenderCache = new ConnectionRenderCache();
  readonly #context: CanvasRenderingContext2D;
  #height: number;
  readonly #packetRouteCache = new PacketRouteCache();
  readonly #packetRenderOptions: PacketRenderOptions;
  readonly #portsVisible: boolean;
  readonly #textLineCache: TextLineCache;
  readonly #theme: ResolvedCanvasTheme;
  #width: number;

  constructor(options: CanvasRendererOptions) {
    this.#context = options.context;
    this.#height = options.height;
    this.#packetRenderOptions = options.packet;
    this.#textLineCache = new TextLineCache(this.#context);
    this.#portsVisible = options.portsVisible;
    this.#theme = options.theme;
    this.#width = options.width;
  }

  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
  }

  render(
    nodes: readonly CanvasNode[],
    connections: readonly CanvasConnection[],
    packets: readonly RenderPacket[],
    interactionState: RenderInteractionState,
  ): void {
    this.#context.clearRect(0, 0, this.#width, this.#height);
    const arrowheads: ArrowheadSpec[] = [];
    const connectionLabels: ConnectionLabelSpec[] = [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const connectionRenderModelById = new Map<string, ConnectionRenderModel>();
    const usedPorts = new Map<string, Point>();

    for (const connection of connections) {
      const sourceNode = nodeById.get(connection.sourceNodeId);
      const targetNode = nodeById.get(connection.targetNodeId);

      if (!sourceNode || !targetNode) {
        continue;
      }

      const renderModel = this.#connectionRenderCache.getRenderModel(
        connection,
        sourceNode,
        targetNode,
        this.#portsVisible,
      );
      const resolvedStroke = resolveConnectionStroke(connection.style.stroke);

      this.#context.beginPath();
      this.#context.strokeStyle = connection.style.color;
      this.#context.lineWidth = CONNECTION_LINE_WIDTH;
      this.#context.lineJoin = 'round';
      if (resolvedStroke.animated) {
        this.#context.setLineDash(resolvedStroke.lineDash);
        this.#context.lineDashOffset = interactionState.connectionDashOffset;
      } else {
        this.#context.setLineDash(resolvedStroke.lineDash);
        this.#context.lineDashOffset = 0;
      }
      this.#context.moveTo(renderModel.visiblePath.start.x, renderModel.visiblePath.start.y);
      drawConnectionPath(this.#context, renderModel.visiblePath);
      this.#context.stroke();
      this.#context.setLineDash([]);
      this.#context.lineDashOffset = 0;

      arrowheads.push(...resolveArrowheads(renderModel.path, connection.style.arrow, connection.style.color));
      connectionRenderModelById.set(connection.id, renderModel);

      if (connection.label) {
        connectionLabels.push({
          point: interpolatePointOnPolyline(renderModel.routePoints, 0.5),
          text: connection.label,
        });
      }

      if (this.#portsVisible) {
        if (renderModel.sourcePort) {
          usedPorts.set(
            `${renderModel.sourcePort.nodeId}:${renderModel.sourcePort.side}`,
            renderModel.sourcePort.point,
          );
        }

        if (renderModel.targetPort) {
          usedPorts.set(
            `${renderModel.targetPort.nodeId}:${renderModel.targetPort.side}`,
            renderModel.targetPort.point,
          );
        }
      }
    }

    for (const label of connectionLabels) {
      this.#drawConnectionLabel(label);
    }

    for (const packet of packets) {
      if (packet.status !== 'running') {
        continue;
      }

      const routePoints = this.#packetRouteCache.getRoutePoints(
        nodeById,
        connectionRenderModelById,
        packet.route,
      );

      if (routePoints.length < 2) {
        continue;
      }

      const position = interpolatePointOnPolyline(routePoints, packet.progress);
      const packetOptions = this.#resolvePacketRenderOptions(packet);

      if (packetOptions.trail) {
        this.#drawPacketTrail(routePoints, packet.progress, packetOptions);
      }

      this.#context.beginPath();
      this.#context.fillStyle = packetOptions.color;
      this.#context.arc(
        position.x,
        position.y,
        packetOptions.radius,
        0,
        FULL_CIRCLE_RADIANS,
      );
      this.#context.fill();
    }

    const nodeHighlightById = new Map(
      interactionState.nodeHighlights.map((highlight) => [
        highlight.nodeId,
        highlight,
      ]),
    );

    for (const node of nodes) {
      const highlight = nodeHighlightById.get(node.id);

      if (highlight) {
        this.#drawNodeHighlight(node, highlight);
      }

      this.#drawNodeSurface(
        node,
        interactionState.hoveredNodeId === node.id,
      );

      this.#drawLabel(node);
    }

    if (this.#portsVisible) {
      for (const point of usedPorts.values()) {
        this.#drawPort(point);
      }
    }

    for (const arrowhead of arrowheads) {
      this.#drawArrowhead(
        arrowhead.point,
        arrowhead.tangent,
        arrowhead.isStart,
        arrowhead.fillStyle,
      );
    }
  }

  #resolvePacketRenderOptions(
    packet: RenderPacket,
  ): ResolvedPacketRenderOptions {
    return {
      color: packet.style?.color ?? this.#theme.tokens.packetColor,
      radius: packet.style?.radius ?? this.#packetRenderOptions.radius,
      trail: packet.style?.trail ?? this.#packetRenderOptions.trail,
      trailColor:
        packet.style?.trailColor ?? this.#theme.tokens.packetTrailColor,
      trailLength:
        packet.style?.trailLength ?? this.#packetRenderOptions.trailLength,
    };
  }

  #drawPacketTrail(
    routePoints: readonly Point[],
    progress: number,
    options: ResolvedPacketRenderOptions,
  ): void {
    const trailPoints = getPolylineSegmentBeforeProgress(
      routePoints,
      progress,
      options.trailLength,
    );
    const firstPoint = trailPoints[0];

    if (!firstPoint || trailPoints.length < 2) {
      return;
    }

    this.#context.beginPath();
    this.#context.strokeStyle = options.trailColor;
    this.#context.lineWidth = Math.max(options.radius, 1);
    this.#context.setLineDash([]);
    this.#context.lineDashOffset = 0;
    this.#context.moveTo(firstPoint.x, firstPoint.y);

    for (const point of trailPoints.slice(1)) {
      this.#context.lineTo(point.x, point.y);
    }

    this.#context.stroke();
  }

  #drawConnectionLabel(label: ConnectionLabelSpec): void {
    this.#context.font = CONNECTION_LABEL_FONT;
    this.#context.textAlign = 'center';
    this.#context.textBaseline = 'middle';

    const textWidth = this.#context.measureText(label.text).width;
    const labelWidth = textWidth + CONNECTION_LABEL_PADDING_X * 2;
    const labelX = label.point.x - labelWidth / 2;
    const labelY = label.point.y - CONNECTION_LABEL_HEIGHT / 2;

    this.#context.beginPath();
    this.#context.fillStyle = this.#theme.tokens.connectionLabelBackgroundColor;
    this.#context.strokeStyle = this.#theme.tokens.connectionLabelBorderColor;
    this.#context.lineWidth = CONNECTION_LABEL_BORDER_WIDTH;
    this.#context.roundRect(
      labelX,
      labelY,
      labelWidth,
      CONNECTION_LABEL_HEIGHT,
      CONNECTION_LABEL_RADIUS,
    );
    this.#context.fill();
    this.#context.stroke();

    this.#context.fillStyle = this.#theme.tokens.connectionLabelTextColor;
    this.#context.fillText(label.text, label.point.x, label.point.y);
  }

  #drawPort(point: Point): void {
    this.#context.beginPath();
    this.#context.fillStyle = this.#theme.tokens.portFillColor;
    this.#context.strokeStyle = this.#theme.tokens.portBorderColor;
    this.#context.lineWidth = PORT_BORDER_WIDTH;
    this.#context.arc(point.x, point.y, NODE_PORT_RADIUS, 0, FULL_CIRCLE_RADIANS);
    this.#context.fill();
    this.#context.stroke();
  }

  #drawNodeHighlight(node: CanvasNode, highlight: NodeHighlight): void {
    const intensity = Math.max(1 - highlight.progress, 0);

    if (intensity <= 0) {
      return;
    }

    this.#context.beginPath();
    this.#context.strokeStyle = highlight.color;
    this.#context.lineWidth = NODE_HIGHLIGHT_LINE_WIDTH * intensity;
    this.#context.shadowBlur = NODE_HIGHLIGHT_SHADOW_BLUR * intensity;
    this.#context.shadowColor = highlight.color;
    this.#context.shadowOffsetY = 0;
    this.#context.setLineDash([]);
    this.#context.lineDashOffset = 0;

    if (node.shape === 'circle') {
      this.#context.arc(
        node.x,
        node.y,
        Math.min(node.width, node.height) / 2 + 6,
        0,
        FULL_CIRCLE_RADIANS,
      );
    } else {
      this.#context.roundRect(
        node.x - node.width / 2 - 6,
        node.y - node.height / 2 - 6,
        node.width + 12,
        node.height + 12,
        NODE_RECTANGLE_RADIUS + 6,
      );
    }

    this.#context.stroke();
    this.#context.shadowBlur = 0;
    this.#context.shadowColor = 'transparent';
    this.#context.shadowOffsetY = 0;
  }

  #drawArrowhead(
    point: Point,
    tangent: Point,
    isStart: boolean,
    fillStyle: string,
  ): void {
    const dx = tangent.x;
    const dy = tangent.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) {
      return;
    }

    const ux = dx / length;
    const uy = dy / length;
    const perpX = -uy;
    const perpY = ux;
    const direction = isStart ? 1 : -1;
    const tipX = point.x + ux * ARROWHEAD_NODE_CLEARANCE * direction;
    const tipY = point.y + uy * ARROWHEAD_NODE_CLEARANCE * direction;
    const baseX = tipX + ux * ARROWHEAD_LENGTH * direction;
    const baseY = tipY + uy * ARROWHEAD_LENGTH * direction;

    this.#context.beginPath();
    this.#context.fillStyle = fillStyle;
    this.#context.moveTo(tipX, tipY);
    this.#context.lineTo(
      baseX + perpX * ARROWHEAD_SPREAD,
      baseY + perpY * ARROWHEAD_SPREAD,
    );
    this.#context.lineTo(
      baseX - perpX * ARROWHEAD_SPREAD,
      baseY - perpY * ARROWHEAD_SPREAD,
    );
    this.#context.closePath();
    this.#context.fill();
  }

  #drawNodeSurface(node: CanvasNode, isHovered: boolean): void {
    const shadowBlur = isHovered ? NODE_HOVER_SHADOW_BLUR : NODE_SHADOW_BLUR;
    const strokeStyle = isHovered
      ? this.#theme.tokens.nodeHoverBorderColor
      : this.#theme.tokens.nodeBorderColor;
    const lineWidth = isHovered ? NODE_HOVER_BORDER_WIDTH : NODE_BORDER_WIDTH;

    this.#context.save();
    this.#context.fillStyle = node.color;
    this.#context.shadowBlur = shadowBlur;
    this.#context.shadowColor = this.#theme.tokens.nodeShadowColor;
    this.#context.shadowOffsetY = NODE_SHADOW_OFFSET_Y;

    if (node.shape === 'circle') {
      this.#context.beginPath();
      this.#context.arc(node.x, node.y, Math.min(node.width, node.height) / 2, 0, FULL_CIRCLE_RADIANS);
      this.#context.fill();
    } else {
      this.#context.beginPath();
      this.#context.roundRect(
        node.x - node.width / 2,
        node.y - node.height / 2,
        node.width,
        node.height,
        NODE_RECTANGLE_RADIUS,
      );
      this.#context.fill();
    }

    this.#context.shadowBlur = 0;
    this.#context.shadowColor = 'transparent';
    this.#context.shadowOffsetY = 0;
    this.#context.strokeStyle = strokeStyle;
    this.#context.lineWidth = lineWidth;
    this.#context.stroke();
    this.#context.restore();
  }

  #drawLabel(node: CanvasNode): void {
    const titleLines = this.#textLineCache.getTitleLines(node);

    this.#context.fillStyle = this.#theme.tokens.nodeTextColor;
    this.#context.font = getTitleFont();
    this.#context.textAlign = 'center';
    this.#context.textBaseline = 'middle';

    const titleStartY = node.y - ((titleLines.length - 1) * getTitleLineHeight()) / 2;

    for (const [index, line] of titleLines.entries()) {
      this.#context.fillText(line, node.x, titleStartY + index * getTitleLineHeight());
    }

    if (!node.description) {
      return;
    }

    const descriptionLines = this.#textLineCache.getDescriptionLines(node);

    this.#context.fillStyle = this.#theme.tokens.nodeSecondaryTextColor;
    this.#context.font = getDescriptionFont();
    this.#context.textBaseline = 'top';

    const descriptionStartY = node.y + this.#getDescriptionOffset(node);

    for (const [index, line] of descriptionLines.entries()) {
      this.#context.fillText(
        line,
        node.x,
        descriptionStartY + index * getDescriptionLineHeight(),
      );
    }
  }

  #getDescriptionOffset(node: CanvasNode): number {
    return node.height / 2 + NODE_TEXT_GAP;
  }
}
