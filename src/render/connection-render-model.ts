import {
  getConnectionEndTangent,
  getConnectionStartTangent,
  interpolatePointOnPath,
  resolveAutomaticPorts,
  resolveConnectionPath,
  type ConnectionPath,
  type Point,
  type PortSide,
} from '../core/geometry';
import type {
  CanvasArrowStyle,
  CanvasConnection,
  CanvasNode,
} from '../types/public';

const ARROWHEAD_LENGTH = 14;

type CachedConnectionRenderModel = Readonly<{
  path: ConnectionPath;
  routePoints: readonly Point[];
  sourcePort: ConnectionPort | null;
  signature: string;
  targetPort: ConnectionPort | null;
  visiblePath: ConnectionPath;
}>;

type ConnectionPort = Readonly<{
  nodeId: string;
  point: Point;
  side: PortSide;
}>;

export type ArrowheadSpec = Readonly<{
  fillStyle: string;
  isStart: boolean;
  point: Point;
  tangent: Point;
}>;

export type ConnectionRenderModel = Readonly<{
  id: string;
  path: ConnectionPath;
  routePoints: readonly Point[];
  sourcePort: ConnectionPort | null;
  signature: string;
  sourceNodeId: string;
  targetPort: ConnectionPort | null;
  visiblePath: ConnectionPath;
}>;

export class ConnectionRenderCache {
  readonly #cache = new Map<string, CachedConnectionRenderModel>();

  getRenderModel(
    connection: CanvasConnection,
    sourceNode: CanvasNode,
    targetNode: CanvasNode,
    portsVisible = false,
  ): ConnectionRenderModel {
    const resolvedPorts = portsVisible
      ? resolveAutomaticPorts(sourceNode, targetNode)
      : null;
    const signature = [
      sourceNode.x,
      sourceNode.y,
      sourceNode.width,
      sourceNode.height,
      sourceNode.shape,
      targetNode.x,
      targetNode.y,
      targetNode.width,
      targetNode.height,
      targetNode.shape,
      connection.style.line,
      connection.style.arrow,
      portsVisible ? resolvedPorts?.sourcePort.side : 'free',
      portsVisible ? resolvedPorts?.targetPort.side : 'free',
    ].join('|');
    const cachedModel = this.#cache.get(connection.id);

    if (cachedModel && cachedModel.signature === signature) {
      return {
        id: connection.id,
        path: cachedModel.path,
        routePoints: cachedModel.routePoints,
        sourcePort: cachedModel.sourcePort,
        signature,
        sourceNodeId: connection.sourceNodeId,
        targetPort: cachedModel.targetPort,
        visiblePath: cachedModel.visiblePath,
      };
    }

    const path = resolveConnectionPath(sourceNode, targetNode, connection.style.line, portsVisible);
    const visiblePath = getVisiblePath(path, connection.style.arrow);
    const routePoints = sampleConnectionPath(visiblePath);
    const sourcePort = resolvedPorts
      ? {
          nodeId: connection.sourceNodeId,
          point: resolvedPorts.sourcePort.point,
          side: resolvedPorts.sourcePort.side,
        }
      : null;
    const targetPort = resolvedPorts
      ? {
          nodeId: connection.targetNodeId,
          point: resolvedPorts.targetPort.point,
          side: resolvedPorts.targetPort.side,
        }
      : null;

    this.#cache.set(connection.id, {
      path,
      routePoints,
      sourcePort,
      signature,
      targetPort,
      visiblePath,
    });

    return {
      id: connection.id,
      path,
      routePoints,
      sourcePort,
      signature,
      sourceNodeId: connection.sourceNodeId,
      targetPort,
      visiblePath,
    };
  }
}

export function drawConnectionPath(
  context: Pick<CanvasRenderingContext2D, 'bezierCurveTo' | 'lineTo'>,
  path: ConnectionPath,
): void {
  if (path.line === 'bezier') {
    context.bezierCurveTo(
      path.control1.x,
      path.control1.y,
      path.control2.x,
      path.control2.y,
      path.end.x,
      path.end.y,
    );

    return;
  }

  context.lineTo(path.end.x, path.end.y);
}

export function interpolatePointOnPolyline(points: readonly Point[], progress: number): Point {
  const firstPoint = points[0];

  if (!firstPoint) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return firstPoint;
  }

  const segments = points.slice(1).flatMap((point, index) => {
    const start = points[index];

    if (!start) {
      return [];
    }

    return [{
      end: point,
      length: Math.hypot(point.x - start.x, point.y - start.y),
      start,
    }];
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);

  if (totalLength === 0) {
    return points[points.length - 1] ?? firstPoint;
  }

  let remainingLength = totalLength * progress;

  for (const segment of segments) {
    if (remainingLength <= segment.length) {
      const segmentProgress = segment.length === 0 ? 0 : remainingLength / segment.length;

      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
        y: segment.start.y + (segment.end.y - segment.start.y) * segmentProgress,
      };
    }

    remainingLength -= segment.length;
  }

  return points[points.length - 1] ?? firstPoint;
}

export function resolveArrowheads(
  path: ConnectionPath,
  arrowStyle: CanvasArrowStyle,
  fillStyle: string,
): ArrowheadSpec[] {
  const arrowheads: ArrowheadSpec[] = [];

  if (arrowStyle === 'start' || arrowStyle === 'both') {
    arrowheads.push({
      fillStyle,
      isStart: true,
      point: path.start,
      tangent: getConnectionStartTangent(path),
    });
  }

  if (arrowStyle === 'end' || arrowStyle === 'both') {
    arrowheads.push({
      fillStyle,
      isStart: false,
      point: path.end,
      tangent: getConnectionEndTangent(path),
    });
  }

  return arrowheads;
}

function getVisiblePath(path: ConnectionPath, arrowStyle: CanvasArrowStyle): ConnectionPath {
  if (path.line === 'bezier') {
    return getVisibleBezierPath(path, arrowStyle);
  }

  return path;
}

function getVisibleBezierPath(
  path: Extract<ConnectionPath, { line: 'bezier' }>,
  arrowStyle: CanvasArrowStyle,
): Extract<ConnectionPath, { line: 'bezier' }> {
  let visiblePath = path;

  if (arrowStyle === 'start' || arrowStyle === 'both') {
    visiblePath = trimBezierStart(visiblePath, ARROWHEAD_LENGTH);
  }

  if (arrowStyle === 'end' || arrowStyle === 'both') {
    visiblePath = trimBezierEnd(visiblePath, ARROWHEAD_LENGTH);
  }

  return visiblePath;
}

function sampleConnectionPath(path: ConnectionPath): Point[] {
  if (path.line === 'straight') {
    return [path.start, path.end];
  }

  const samples: Point[] = [];
  const sampleCount = 12;

  for (let index = 0; index <= sampleCount; index += 1) {
    samples.push(interpolatePointOnPath(path, index / sampleCount));
  }

  return samples;
}

function trimBezierEnd(
  path: Extract<ConnectionPath, { line: 'bezier' }>,
  trimDistance: number,
): Extract<ConnectionPath, { line: 'bezier' }> {
  const tangent = getConnectionEndTangent(path);
  const length = Math.hypot(tangent.x, tangent.y);

  if (length === 0) {
    return path;
  }

  const distance = Math.min(trimDistance, length);
  const trimX = (tangent.x / length) * distance;
  const trimY = (tangent.y / length) * distance;

  return {
    ...path,
    control2: {
      x: path.control2.x - trimX,
      y: path.control2.y - trimY,
    },
    end: {
      x: path.end.x - trimX,
      y: path.end.y - trimY,
    },
  };
}

function trimBezierStart(
  path: Extract<ConnectionPath, { line: 'bezier' }>,
  trimDistance: number,
): Extract<ConnectionPath, { line: 'bezier' }> {
  const tangent = getConnectionStartTangent(path);
  const length = Math.hypot(tangent.x, tangent.y);

  if (length === 0) {
    return path;
  }

  const distance = Math.min(trimDistance, length);
  const trimX = (tangent.x / length) * distance;
  const trimY = (tangent.y / length) * distance;

  return {
    ...path,
    control1: {
      x: path.control1.x + trimX,
      y: path.control1.y + trimY,
    },
    start: {
      x: path.start.x + trimX,
      y: path.start.y + trimY,
    },
  };
}
