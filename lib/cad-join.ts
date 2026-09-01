import { arcGeometryIsValid, arcPointAtFraction, arcSweepAngle, normalizeArcAngle, type ArcGeometry } from "./cad-arc.ts";
import { circleGeometryIsValid, type CircleGeometry } from "./cad-circle.ts";
import { lineGeometryIsValid, type LineGeometry, type PlanPoint } from "./cad-line.ts";
import {
  polylineGeometryIsValid,
  polylineSegmentCircularGeometry,
  polylineSegments,
  type PlanSegment,
  type PolylineGeometry,
} from "./cad-polyline.ts";

export const JOIN_ENDPOINT_TOLERANCE = 1 / 64;
const GEOMETRY_EPSILON = 1e-8;

export type JoinCurveGeometry =
  | { geometry: ArcGeometry; kind: "arc" }
  | { geometry: LineGeometry; kind: "line" }
  | { geometry: PolylineGeometry; kind: "polyline" };

export type JoinedCurveGeometry =
  | { geometry: ArcGeometry; kind: "arc" }
  | { geometry: CircleGeometry; kind: "circle" }
  | { geometry: LineGeometry; kind: "line" }
  | { geometry: PolylineGeometry; kind: "polyline" };

type JoinPath = { end: PlanPoint; elevation: number; segments: PlanSegment[]; start: PlanPoint; width: number };

function stableNumber(value: number): number {
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function stablePoint(point: PlanPoint): PlanPoint {
  return { x: stableNumber(point.x), y: stableNumber(point.y) };
}

function cleanBulge(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function pointsMatch(first: PlanPoint, second: PlanPoint): boolean {
  return Math.hypot(first.x - second.x, first.y - second.y) <= JOIN_ENDPOINT_TOLERANCE;
}

function pathFromCurve(curve: JoinCurveGeometry): JoinPath | null {
  if (curve.kind === "line") {
    if (Math.abs(curve.geometry.start.z - curve.geometry.end.z) > GEOMETRY_EPSILON) return null;
    const start = { x: curve.geometry.start.x, y: curve.geometry.start.y };
    const end = { x: curve.geometry.end.x, y: curve.geometry.end.y };
    return { start, end, elevation: curve.geometry.start.z, segments: [{ start, end, bulge: 0 }], width: 0 };
  }
  if (curve.kind === "arc") {
    const startPoint = arcPointAtFraction(curve.geometry, 0);
    const endPoint = arcPointAtFraction(curve.geometry, 1);
    const start = { x: startPoint.x, y: startPoint.y };
    const end = { x: endPoint.x, y: endPoint.y };
    const signedSweep = arcSweepAngle(curve.geometry) * Math.PI / 180 * (curve.geometry.counterclockwise ? 1 : -1);
    return {
      start,
      end,
      elevation: curve.geometry.center.z,
      segments: [{ start, end, bulge: Math.tan(signedSweep / 4) }],
      width: 0,
    };
  }
  if (curve.geometry.closed) return null;
  const segments = polylineSegments(curve.geometry).map((segment) => ({ ...segment, start: { ...segment.start }, end: { ...segment.end } }));
  if (!segments.length) return null;
  return { start: { ...segments[0].start }, end: { ...segments.at(-1)!.end }, elevation: curve.geometry.elevation, segments, width: curve.geometry.width ?? 0 };
}

function reversePath(path: JoinPath): JoinPath {
  const segments = [...path.segments].reverse().map((segment) => ({
    start: { ...segment.end },
    end: { ...segment.start },
    bulge: cleanBulge(-segment.bulge),
  }));
  return { start: { ...path.end }, end: { ...path.start }, elevation: path.elevation, segments, width: path.width };
}

function endpointDegrees(paths: JoinPath[]): number[] {
  const nodes: PlanPoint[] = [];
  const degree: number[] = [];
  paths.forEach((path) => {
    [path.start, path.end].forEach((point) => {
      let index = nodes.findIndex((node) => pointsMatch(node, point));
      if (index < 0) {
        index = nodes.length;
        nodes.push(point);
        degree.push(0);
      }
      degree[index] += 1;
    });
  });
  return degree;
}

function orderedSegments(paths: JoinPath[]): { closed: boolean; segments: PlanSegment[] } | null {
  const degrees = endpointDegrees(paths);
  if (degrees.some((degree) => degree > 2)) return null;
  const oddCount = degrees.filter((degree) => degree === 1).length;
  if (oddCount !== 0 && oddCount !== 2) return null;

  const pointDegree = (point: PlanPoint) => paths.reduce((total, path) =>
    total + Number(pointsMatch(path.start, point)) + Number(pointsMatch(path.end, point)), 0);
  const currentIndex = oddCount === 2
    ? paths.findIndex((path) => pointDegree(path.start) === 1 || pointDegree(path.end) === 1)
    : 0;
  if (currentIndex < 0) return null;
  const remaining = paths.filter((_, index) => index !== currentIndex);
  let current = paths[currentIndex];
  if (oddCount === 2) {
    if (pointDegree(current.start) !== 1) current = reversePath(current);
  }
  const segments = current.segments.map((segment) => ({ ...segment, start: { ...segment.start }, end: { ...segment.end } }));
  let end = { ...current.end };

  while (remaining.length) {
    const index = remaining.findIndex((path) => pointsMatch(path.start, end) || pointsMatch(path.end, end));
    if (index < 0) return null;
    let next = remaining.splice(index, 1)[0];
    if (!pointsMatch(next.start, end)) next = reversePath(next);
    next.segments[0] = { ...next.segments[0], start: { ...end } };
    segments.push(...next.segments);
    end = { ...next.end };
  }

  const closed = pointsMatch(segments[0].start, end);
  if (closed) segments[segments.length - 1] = { ...segments.at(-1)!, end: { ...segments[0].start } };
  return { closed, segments };
}

function joinedLine(segments: PlanSegment[], elevation: number, closed: boolean): LineGeometry | null {
  if (closed || !segments.every((segment) => Math.abs(segment.bulge) <= GEOMETRY_EPSILON)) return null;
  const start = segments[0].start;
  const end = segments.at(-1)!.end;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= GEOMETRY_EPSILON) return null;
  const collinear = segments.every((segment) => {
    const startCross = dx * (segment.start.y - start.y) - dy * (segment.start.x - start.x);
    const endCross = dx * (segment.end.y - start.y) - dy * (segment.end.x - start.x);
    return Math.abs(startCross) / length <= JOIN_ENDPOINT_TOLERANCE && Math.abs(endCross) / length <= JOIN_ENDPOINT_TOLERANCE;
  });
  if (!collinear) return null;
  const geometry = {
    start: { ...stablePoint(start), z: elevation },
    end: { ...stablePoint(end), z: elevation },
  };
  return lineGeometryIsValid(geometry) ? geometry : null;
}

function joinedCircular(segments: PlanSegment[], elevation: number, closed: boolean): JoinedCurveGeometry | null {
  const circular = segments.map(polylineSegmentCircularGeometry);
  if (circular.some((geometry) => !geometry)) return null;
  const first = circular[0]!;
  const sameCircle = circular.every((geometry) => geometry &&
    Math.hypot(geometry.center.x - first.center.x, geometry.center.y - first.center.y) <= JOIN_ENDPOINT_TOLERANCE &&
    Math.abs(geometry.radius - first.radius) <= JOIN_ENDPOINT_TOLERANCE &&
    geometry.counterclockwise === first.counterclockwise);
  if (!sameCircle) return null;
  const totalSweep = segments.reduce((total, segment) => total + Math.abs(4 * Math.atan(segment.bulge)), 0);
  if (closed && Math.abs(totalSweep - Math.PI * 2) <= 1e-6) {
    const geometry = { center: { ...stablePoint(first.center), z: elevation }, radius: stableNumber(first.radius) };
    return circleGeometryIsValid(geometry) ? { kind: "circle", geometry } : null;
  }
  if (totalSweep >= Math.PI * 2 - 1e-6) return null;
  const start = segments[0].start;
  const end = segments.at(-1)!.end;
  const geometry: ArcGeometry = {
    center: { ...stablePoint(first.center), z: elevation },
    radius: stableNumber(first.radius),
    startAngle: normalizeArcAngle(Math.atan2(start.y - first.center.y, start.x - first.center.x) * 180 / Math.PI),
    endAngle: normalizeArcAngle(Math.atan2(end.y - first.center.y, end.x - first.center.x) * 180 / Math.PI),
    counterclockwise: first.counterclockwise,
  };
  return arcGeometryIsValid(geometry) ? { kind: "arc", geometry } : null;
}

function joinedPolyline(segments: PlanSegment[], elevation: number, closed: boolean, width: number): PolylineGeometry | null {
  const geometry: PolylineGeometry = {
    vertices: closed
      ? segments.map((segment) => stablePoint(segment.start))
      : [stablePoint(segments[0].start), ...segments.map((segment) => stablePoint(segment.end))],
    bulges: segments.map((segment) => cleanBulge(segment.bulge)),
    closed,
    elevation,
    width,
  };
  return polylineGeometryIsValid(geometry) ? geometry : null;
}

export function joinCurveGeometries(curves: JoinCurveGeometry[]): JoinedCurveGeometry | null {
  if (curves.length < 2) return null;
  const paths = curves.map(pathFromCurve);
  if (paths.some((path) => !path)) return null;
  const validPaths = paths as JoinPath[];
  const elevation = validPaths[0].elevation;
  if (validPaths.some((path) => Math.abs(path.elevation - elevation) > GEOMETRY_EPSILON)) return null;
  const ordered = orderedSegments(validPaths);
  if (!ordered) return null;
  const line = joinedLine(ordered.segments, elevation, ordered.closed);
  if (line) return { kind: "line", geometry: line };
  const circular = joinedCircular(ordered.segments, elevation, ordered.closed);
  if (circular) return circular;
  const polyline = joinedPolyline(ordered.segments, elevation, ordered.closed, validPaths[0].width);
  return polyline ? { kind: "polyline", geometry: polyline } : null;
}
