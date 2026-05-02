import type { CanvasLineStyle, CanvasNode, CanvasNodePort } from '../types/public';

export const NODE_RECTANGLE_RADIUS = 18;
export const NODE_PORT_RADIUS = 5;

export type Point = {
  x: number;
  y: number;
};

export type PortSide = 'left' | 'right' | 'top' | 'bottom';

export type PortAnchor = Readonly<{
  normal: Point;
  point: Point;
  side: PortSide;
}>;

export type ConnectionPath =
  | {
      end: Point;
      line: 'straight';
      start: Point;
    }
  | {
      control1: Point;
      control2: Point;
      end: Point;
      line: 'bezier';
      start: Point;
    };

export function resolveConnectionPath(
  sourceNode: CanvasNode,
  targetNode: CanvasNode,
  lineStyle: CanvasLineStyle,
  portsVisible = false,
  explicitPorts?: Readonly<{
    sourcePort?: CanvasNodePort;
    targetPort?: CanvasNodePort;
  }>,
): ConnectionPath {
  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;

  if (dx === 0 && dy === 0) {
    const point = { x: sourceNode.x, y: sourceNode.y };

    return {
      end: point,
      line: lineStyle,
      start: point,
      ...(lineStyle === 'bezier'
        ? {
            control1: point,
            control2: point,
          }
        : {}),
    } as ConnectionPath;
  }

  if (portsVisible || explicitPorts?.sourcePort || explicitPorts?.targetPort) {
    const automaticPorts = resolveAutomaticPorts(sourceNode, targetNode);
    const sourcePort = explicitPorts?.sourcePort
      ? getNodePortAnchor(sourceNode, explicitPorts.sourcePort.side)
      : automaticPorts.sourcePort;
    const targetPort = explicitPorts?.targetPort
      ? getNodePortAnchor(targetNode, explicitPorts.targetPort.side)
      : automaticPorts.targetPort;

    if (lineStyle === 'straight') {
      return {
        end: targetPort.point,
        line: 'straight',
        start: sourcePort.point,
      };
    }

    const orientation = isHorizontalPort(sourcePort.side) ? 'horizontal' : 'vertical';
    const controlOffset = getBezierControlOffset(
      targetPort.point.x - sourcePort.point.x,
      targetPort.point.y - sourcePort.point.y,
      orientation,
    );

    return {
      control1: getBezierControlPoint(sourcePort.point, sourcePort.normal, controlOffset),
      control2: getBezierControlPoint(targetPort.point, targetPort.normal, controlOffset),
      end: targetPort.point,
      line: 'bezier',
      start: sourcePort.point,
    };
  }

  const start = getNodeBoundaryPoint(sourceNode, dx, dy);
  const end = getNodeBoundaryPoint(targetNode, -dx, -dy);

  if (lineStyle === 'straight') {
    return {
      end,
      line: 'straight',
      start,
    };
  }

  const orientation = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
  const direction =
    orientation === 'horizontal'
      ? { x: Math.sign(dx) || 1, y: 0 }
      : { x: 0, y: Math.sign(dy) || 1 };
  const anchoredStart = getNodeBoundaryPoint(sourceNode, direction.x, direction.y);
  const anchoredEnd = getNodeBoundaryPoint(targetNode, -direction.x, -direction.y);
  const controlOffset = getBezierControlOffset(dx, dy, orientation);

  return {
    control1: getBezierControlPoint(anchoredStart, direction, controlOffset),
    control2: getBezierControlPoint(
      anchoredEnd,
      { x: -direction.x, y: -direction.y },
      controlOffset,
    ),
    end: anchoredEnd,
    line: 'bezier',
    start: anchoredStart,
  };
}

export function resolveAutomaticPorts(
  sourceNode: CanvasNode,
  targetNode: CanvasNode,
): Readonly<{
  sourcePort: PortAnchor;
  targetPort: PortAnchor;
}> {
  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sourceSide: PortSide = dx >= 0 ? 'right' : 'left';
    const targetSide: PortSide = sourceSide === 'right' ? 'left' : 'right';

    return {
      sourcePort: getNodePortAnchor(sourceNode, sourceSide),
      targetPort: getNodePortAnchor(targetNode, targetSide),
    };
  }

  const sourceSide: PortSide = dy >= 0 ? 'bottom' : 'top';
  const targetSide: PortSide = sourceSide === 'bottom' ? 'top' : 'bottom';

  return {
    sourcePort: getNodePortAnchor(sourceNode, sourceSide),
    targetPort: getNodePortAnchor(targetNode, targetSide),
  };
}

export function isPointInsideNode(node: CanvasNode, x: number, y: number): boolean {
  if (node.shape === 'circle') {
    const radius = Math.min(node.width, node.height) / 2;

    return Math.hypot(x - node.x, y - node.y) <= radius;
  }

  return (
    x >= node.x - node.width / 2 &&
    x <= node.x + node.width / 2 &&
    y >= node.y - node.height / 2 &&
    y <= node.y + node.height / 2
  );
}

export function getConnectionEndTangent(path: ConnectionPath): Point {
  if (path.line === 'bezier') {
    return {
      x: path.end.x - path.control2.x,
      y: path.end.y - path.control2.y,
    };
  }

  return {
    x: path.end.x - path.start.x,
    y: path.end.y - path.start.y,
  };
}

export function getConnectionStartTangent(path: ConnectionPath): Point {
  if (path.line === 'bezier') {
    return {
      x: path.control1.x - path.start.x,
      y: path.control1.y - path.start.y,
    };
  }

  return {
    x: path.end.x - path.start.x,
    y: path.end.y - path.start.y,
  };
}

export function interpolatePointOnPath(path: ConnectionPath, progress: number): Point {
  if (path.line === 'bezier') {
    return interpolateBezierPoint(path.start, path.control1, path.control2, path.end, progress);
  }

  return {
    x: path.start.x + (path.end.x - path.start.x) * progress,
    y: path.start.y + (path.end.y - path.start.y) * progress,
  };
}

function getNodeBoundaryPoint(node: CanvasNode, dx: number, dy: number): Point {
  if (node.shape === 'circle') {
    const length = Math.hypot(dx, dy);
    const radius = Math.min(node.width, node.height) / 2;

    if (length === 0) {
      return { x: node.x, y: node.y };
    }

    return {
      x: node.x + (dx / length) * radius,
      y: node.y + (dy / length) * radius,
    };
  }

  return getRoundedRectBoundaryPoint(node, dx, dy);
}

function getNodePortAnchor(node: CanvasNode, side: PortSide): PortAnchor {
  if (node.shape === 'circle') {
    const radius = Math.min(node.width, node.height) / 2;

    switch (side) {
      case 'left':
        return {
          normal: { x: -1, y: 0 },
          point: { x: node.x - radius, y: node.y },
          side,
        };
      case 'right':
        return {
          normal: { x: 1, y: 0 },
          point: { x: node.x + radius, y: node.y },
          side,
        };
      case 'top':
        return {
          normal: { x: 0, y: -1 },
          point: { x: node.x, y: node.y - radius },
          side,
        };
      case 'bottom':
        return {
          normal: { x: 0, y: 1 },
          point: { x: node.x, y: node.y + radius },
          side,
        };
      default: {
        const exhaustive: never = side;
        throw new Error(`Unhandled port side: ${exhaustive}`);
      }
    }
  }

  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;

  switch (side) {
    case 'left':
      return {
        normal: { x: -1, y: 0 },
        point: { x: node.x - halfWidth, y: node.y },
        side,
      };
    case 'right':
      return {
        normal: { x: 1, y: 0 },
        point: { x: node.x + halfWidth, y: node.y },
        side,
      };
    case 'top':
      return {
        normal: { x: 0, y: -1 },
        point: { x: node.x, y: node.y - halfHeight },
        side,
      };
    case 'bottom':
      return {
        normal: { x: 0, y: 1 },
        point: { x: node.x, y: node.y + halfHeight },
        side,
      };
    default: {
      const exhaustive: never = side;
      throw new Error(`Unhandled port side: ${exhaustive}`);
    }
  }
}

function isHorizontalPort(side: PortSide): boolean {
  return side === 'left' || side === 'right';
}

function getRoundedRectBoundaryPoint(node: CanvasNode, dx: number, dy: number): Point {
  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;
  const radius = Math.min(NODE_RECTANGLE_RADIUS, halfWidth, halfHeight);

  if (radius <= 0) {
    return getSharpRectBoundaryPoint(node, dx, dy);
  }

  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;
  const absoluteDx = Math.abs(dx);
  const absoluteDy = Math.abs(dy);
  const cornerCenterX = halfWidth - radius;
  const cornerCenterY = halfHeight - radius;

  if (absoluteDx === 0) {
    return {
      x: node.x,
      y: node.y + signY * halfHeight,
    };
  }

  if (absoluteDy === 0) {
    return {
      x: node.x + signX * halfWidth,
      y: node.y,
    };
  }

  const yAtVerticalSide = (absoluteDy / absoluteDx) * halfWidth;

  if (yAtVerticalSide <= cornerCenterY) {
    return {
      x: node.x + signX * halfWidth,
      y: node.y + signY * yAtVerticalSide,
    };
  }

  const xAtHorizontalSide = (absoluteDx / absoluteDy) * halfHeight;

  if (xAtHorizontalSide <= cornerCenterX) {
    return {
      x: node.x + signX * xAtHorizontalSide,
      y: node.y + signY * halfHeight,
    };
  }

  const cornerIntersection = getCornerArcIntersection(
    absoluteDx,
    absoluteDy,
    cornerCenterX,
    cornerCenterY,
    radius,
  );

  return {
    x: node.x + signX * cornerIntersection.x,
    y: node.y + signY * cornerIntersection.y,
  };
}

function getCornerArcIntersection(
  absoluteDx: number,
  absoluteDy: number,
  cornerCenterX: number,
  cornerCenterY: number,
  radius: number,
): Point {
  const directionLength = Math.hypot(absoluteDx, absoluteDy);

  if (directionLength === 0) {
    return { x: 0, y: 0 };
  }

  const unitX = absoluteDx / directionLength;
  const unitY = absoluteDy / directionLength;
  const projection = unitX * cornerCenterX + unitY * cornerCenterY;
  const cornerDistanceSquared = cornerCenterX ** 2 + cornerCenterY ** 2 - radius ** 2;
  const discriminant = Math.max(projection ** 2 - cornerDistanceSquared, 0);
  const distance = projection + Math.sqrt(discriminant);

  return {
    x: unitX * distance,
    y: unitY * distance,
  };
}

function getSharpRectBoundaryPoint(node: CanvasNode, dx: number, dy: number): Point {
  const scale = 1 / Math.max(Math.abs(dx) / (node.width / 2), Math.abs(dy) / (node.height / 2));

  return {
    x: node.x + dx * scale,
    y: node.y + dy * scale,
  };
}

function getBezierControlOffset(
  dx: number,
  dy: number,
  orientation: 'horizontal' | 'vertical',
): number {
  const axisDistance = orientation === 'horizontal' ? Math.abs(dx) : Math.abs(dy);

  return Math.max(axisDistance * 0.25, 24);
}

function getBezierControlPoint(anchor: Point, direction: Point, offset: number): Point {
  return {
    x: anchor.x + direction.x * offset,
    y: anchor.y + direction.y * offset,
  };
}

function interpolateBezierPoint(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  progress: number,
): Point {
  const inverse = 1 - progress;
  const inverseSquared = inverse * inverse;
  const progressSquared = progress * progress;

  return {
    x:
      inverseSquared * inverse * start.x +
      3 * inverseSquared * progress * control1.x +
      3 * inverse * progressSquared * control2.x +
      progressSquared * progress * end.x,
    y:
      inverseSquared * inverse * start.y +
      3 * inverseSquared * progress * control1.y +
      3 * inverse * progressSquared * control2.y +
      progressSquared * progress * end.y,
  };
}
