import type { Point } from '../core/geometry';

export function getPolylineSegmentBeforeProgress(
  points: readonly Point[],
  progress: number,
  length: number,
): Point[] {
  const totalLength = getPolylineLength(points);

  if (points.length < 2 || totalLength === 0 || length <= 0) {
    return [];
  }

  const endDistance = totalLength * progress;
  const startDistance = Math.max(endDistance - length, 0);

  if (endDistance <= startDistance) {
    return [];
  }

  return getPolylineSegment(points, startDistance, endDistance);
}

function getPolylineSegment(
  points: readonly Point[],
  startDistance: number,
  endDistance: number,
): Point[] {
  const segmentPoints: Point[] = [];
  let traversedDistance = 0;

  for (const [index, endPoint] of points.slice(1).entries()) {
    const startPoint = points[index];

    if (!startPoint) {
      continue;
    }

    const segmentLength = Math.hypot(
      endPoint.x - startPoint.x,
      endPoint.y - startPoint.y,
    );
    const segmentStartDistance = traversedDistance;
    const segmentEndDistance = traversedDistance + segmentLength;

    if (segmentLength === 0 || segmentEndDistance < startDistance) {
      traversedDistance = segmentEndDistance;
      continue;
    }

    if (segmentStartDistance > endDistance) {
      break;
    }

    const clippedStartDistance = Math.max(startDistance, segmentStartDistance);
    const clippedEndDistance = Math.min(endDistance, segmentEndDistance);

    if (clippedEndDistance < clippedStartDistance) {
      traversedDistance = segmentEndDistance;
      continue;
    }

    const clippedStart = interpolatePointOnSegment(
      startPoint,
      endPoint,
      (clippedStartDistance - segmentStartDistance) / segmentLength,
    );
    const clippedEnd = interpolatePointOnSegment(
      startPoint,
      endPoint,
      (clippedEndDistance - segmentStartDistance) / segmentLength,
    );

    if (segmentPoints.length === 0) {
      segmentPoints.push(clippedStart);
    } else {
      const previousPoint = segmentPoints[segmentPoints.length - 1];

      if (
        previousPoint
        && (Math.abs(previousPoint.x - clippedStart.x) > Number.EPSILON
          || Math.abs(previousPoint.y - clippedStart.y) > Number.EPSILON)
      ) {
        segmentPoints.push(clippedStart);
      }
    }

    segmentPoints.push(clippedEnd);
    traversedDistance = segmentEndDistance;
  }

  return segmentPoints;
}

function getPolylineLength(points: readonly Point[]): number {
  return points.slice(1).reduce((totalLength, point, index) => {
    const start = points[index];

    if (!start) {
      return totalLength;
    }

    return totalLength + Math.hypot(point.x - start.x, point.y - start.y);
  }, 0);
}

function interpolatePointOnSegment(
  start: Point,
  end: Point,
  progress: number,
): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}
