import { snapToSixteenth } from "./architectural-units.ts";
import { arcGeometryIsValid, type ArcGeometry } from "./cad-arc.ts";
import { circleGeometryIsValid, type CircleGeometry } from "./cad-circle.ts";
import {
  lineGeometryIsValid,
  snapPlanPoint,
  type LineGeometry,
  type PlanPoint,
} from "./cad-line.ts";
import {
  polylineGeometryIsValid,
  polylineSegmentCircularGeometry,
  polylineSegmentPoints,
  polylineSegments,
  type PlanSegment,
  type PolylineGeometry,
} from "./cad-polyline.ts";

const OFFSET_EPSILON = 1e-8;

type OffsetLinePrimitive = {
  end: PlanPoint;
  kind: "line";
  start: PlanPoint;
};

type OffsetArcPrimitive = {
  center: PlanPoint;
  counterclockwise: boolean;
  end: PlanPoint;
  kind: "arc";
  radius: number;
  start: PlanPoint;
};

type OffsetPrimitive = OffsetLinePrimitive | OffsetArcPrimitive;

function canonicalPoint(point: PlanPoint): PlanPoint {
  const snapped = snapPlanPoint(point);
  return {
    x: Object.is(snapped.x, -0) ? 0 : snapped.x,
    y: Object.is(snapped.y, -0) ? 0 : snapped.y,
  };
}

function normalizedDistance(distance: number): number | null {
  const snapped = snapToSixteenth(Math.abs(distance));
  return Number.isFinite(snapped) && snapped >= 1 / 16 ? snapped : null;
}

function nearestPointOnSegment(point: PlanPoint, start: PlanPoint, end: PlanPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < OFFSET_EPSILON) return null;
  const parameter = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const nearest = { x: start.x + dx * parameter, y: start.y + dy * parameter };
  return {
    cross: dx * (point.y - nearest.y) - dy * (point.x - nearest.x),
    distance: Math.hypot(point.x - nearest.x, point.y - nearest.y),
  };
}

function sideOfLine(start: PlanPoint, end: PlanPoint, sidePoint: PlanPoint): number | null {
  const nearest = nearestPointOnSegment(sidePoint, start, end);
  if (!nearest || nearest.distance < 1 / 32 || Math.abs(nearest.cross) < OFFSET_EPSILON) return null;
  return Math.sign(nearest.cross);
}

function radialSide(center: PlanPoint, radius: number, sidePoint: PlanPoint): number | null {
  const delta = Math.hypot(sidePoint.x - center.x, sidePoint.y - center.y) - radius;
  if (Math.abs(delta) < 1 / 32) return null;
  return Math.sign(delta);
}

export function offsetLineGeometry(line: LineGeometry, distance: number, sidePoint: PlanPoint): LineGeometry | null {
  const amount = normalizedDistance(distance);
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const planLength = Math.hypot(dx, dy);
  const side = sideOfLine(line.start, line.end, sidePoint);
  if (!amount || planLength < 1 / 16 || !side) return null;
  const offsetX = -dy / planLength * amount * side;
  const offsetY = dx / planLength * amount * side;
  const result = {
    start: { ...canonicalPoint({ x: line.start.x + offsetX, y: line.start.y + offsetY }), z: line.start.z },
    end: { ...canonicalPoint({ x: line.end.x + offsetX, y: line.end.y + offsetY }), z: line.end.z },
  };
  return lineGeometryIsValid(result) ? result : null;
}

export function offsetCircleGeometry(circle: CircleGeometry, distance: number, sidePoint: PlanPoint): CircleGeometry | null {
  const amount = normalizedDistance(distance);
  const side = radialSide(circle.center, circle.radius, sidePoint);
  if (!amount || !side) return null;
  const result = { ...circle, center: { ...circle.center }, radius: snapToSixteenth(circle.radius + amount * side) };
  return circleGeometryIsValid(result) ? result : null;
}

export function offsetArcGeometry(arc: ArcGeometry, distance: number, sidePoint: PlanPoint): ArcGeometry | null {
  const amount = normalizedDistance(distance);
  const side = radialSide(arc.center, arc.radius, sidePoint);
  if (!amount || !side) return null;
  const result = { ...arc, center: { ...arc.center }, radius: snapToSixteenth(arc.radius + amount * side) };
  return arcGeometryIsValid(result) ? result : null;
}

function closestPolylineSide(polyline: PolylineGeometry, sidePoint: PlanPoint): number | null {
  let closest: { cross: number; distance: number } | null = null;
  for (const segment of polylineSegments(polyline)) {
    const points = polylineSegmentPoints(segment, 96);
    for (let index = 1; index < points.length; index += 1) {
      const candidate = nearestPointOnSegment(sidePoint, points[index - 1], points[index]);
      if (candidate && (!closest || candidate.distance < closest.distance)) closest = candidate;
    }
  }
  if (!closest || closest.distance < 1 / 32 || Math.abs(closest.cross) < OFFSET_EPSILON) return null;
  return Math.sign(closest.cross);
}

function offsetSegment(segment: PlanSegment, signedDistance: number): OffsetPrimitive | null {
  const circular = polylineSegmentCircularGeometry(segment);
  if (!circular) {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1 / 16) return null;
    const offsetX = -dy / length * signedDistance;
    const offsetY = dx / length * signedDistance;
    return {
      end: { x: segment.end.x + offsetX, y: segment.end.y + offsetY },
      kind: "line",
      start: { x: segment.start.x + offsetX, y: segment.start.y + offsetY },
    };
  }
  const radius = circular.radius - (circular.counterclockwise ? 1 : -1) * signedDistance;
  if (!Number.isFinite(radius) || radius < 1 / 16) return null;
  const radialPoint = (point: PlanPoint) => {
    const dx = point.x - circular.center.x;
    const dy = point.y - circular.center.y;
    const length = Math.hypot(dx, dy);
    return { x: circular.center.x + dx / length * radius, y: circular.center.y + dy / length * radius };
  };
  return {
    center: circular.center,
    counterclockwise: circular.counterclockwise,
    end: radialPoint(segment.end),
    kind: "arc",
    radius,
    start: radialPoint(segment.start),
  };
}

function lineLineIntersections(first: OffsetLinePrimitive, second: OffsetLinePrimitive): PlanPoint[] {
  const firstX = first.end.x - first.start.x;
  const firstY = first.end.y - first.start.y;
  const secondX = second.end.x - second.start.x;
  const secondY = second.end.y - second.start.y;
  const determinant = firstX * secondY - firstY * secondX;
  if (Math.abs(determinant) < OFFSET_EPSILON) return [];
  const deltaX = second.start.x - first.start.x;
  const deltaY = second.start.y - first.start.y;
  const parameter = (deltaX * secondY - deltaY * secondX) / determinant;
  return [{ x: first.start.x + firstX * parameter, y: first.start.y + firstY * parameter }];
}

function lineCircleIntersections(line: OffsetLinePrimitive, arc: OffsetArcPrimitive): PlanPoint[] {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const offsetX = line.start.x - arc.center.x;
  const offsetY = line.start.y - arc.center.y;
  const a = dx * dx + dy * dy;
  const b = 2 * (offsetX * dx + offsetY * dy);
  const c = offsetX * offsetX + offsetY * offsetY - arc.radius * arc.radius;
  const discriminant = b * b - 4 * a * c;
  if (a < OFFSET_EPSILON || discriminant < -OFFSET_EPSILON) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  const parameters = Math.abs(root) < OFFSET_EPSILON ? [-b / (2 * a)] : [(-b - root) / (2 * a), (-b + root) / (2 * a)];
  return parameters.map((parameter) => ({ x: line.start.x + dx * parameter, y: line.start.y + dy * parameter }));
}

function circleCircleIntersections(first: OffsetArcPrimitive, second: OffsetArcPrimitive): PlanPoint[] {
  const dx = second.center.x - first.center.x;
  const dy = second.center.y - first.center.y;
  const centerDistance = Math.hypot(dx, dy);
  if (centerDistance < OFFSET_EPSILON || centerDistance > first.radius + second.radius + OFFSET_EPSILON || centerDistance < Math.abs(first.radius - second.radius) - OFFSET_EPSILON) return [];
  const along = (first.radius ** 2 - second.radius ** 2 + centerDistance ** 2) / (2 * centerDistance);
  const perpendicular = Math.sqrt(Math.max(0, first.radius ** 2 - along ** 2));
  const base = { x: first.center.x + dx / centerDistance * along, y: first.center.y + dy / centerDistance * along };
  const offset = { x: -dy / centerDistance * perpendicular, y: dx / centerDistance * perpendicular };
  if (perpendicular < OFFSET_EPSILON) return [base];
  return [
    { x: base.x + offset.x, y: base.y + offset.y },
    { x: base.x - offset.x, y: base.y - offset.y },
  ];
}

function primitiveIntersections(first: OffsetPrimitive, second: OffsetPrimitive): PlanPoint[] {
  if (first.kind === "line" && second.kind === "line") return lineLineIntersections(first, second);
  if (first.kind === "line" && second.kind === "arc") return lineCircleIntersections(first, second);
  if (first.kind === "arc" && second.kind === "line") return lineCircleIntersections(second, first);
  return circleCircleIntersections(first as OffsetArcPrimitive, second as OffsetArcPrimitive);
}

function joinPrimitives(first: OffsetPrimitive, second: OffsetPrimitive, originalVertex: PlanPoint): boolean {
  const intersections = primitiveIntersections(first, second);
  const point = intersections.sort((a, b) =>
    Math.hypot(a.x - originalVertex.x, a.y - originalVertex.y) - Math.hypot(b.x - originalVertex.x, b.y - originalVertex.y)
  )[0];
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  first.end = point;
  second.start = point;
  return true;
}

function primitiveBulge(primitive: OffsetPrimitive): number | null {
  if (primitive.kind === "line") return 0;
  const startAngle = Math.atan2(primitive.start.y - primitive.center.y, primitive.start.x - primitive.center.x);
  const endAngle = Math.atan2(primitive.end.y - primitive.center.y, primitive.end.x - primitive.center.x);
  const fullTurn = Math.PI * 2;
  const sweep = primitive.counterclockwise
    ? ((endAngle - startAngle) % fullTurn + fullTurn) % fullTurn
    : ((startAngle - endAngle) % fullTurn + fullTurn) % fullTurn;
  if (sweep < OFFSET_EPSILON) return null;
  const bulge = Math.tan((primitive.counterclockwise ? sweep : -sweep) / 4);
  return Number.isFinite(bulge) ? bulge : null;
}

export function offsetPolylineGeometry(polyline: PolylineGeometry, distance: number, sidePoint: PlanPoint): PolylineGeometry | null {
  const amount = normalizedDistance(distance);
  const side = closestPolylineSide(polyline, sidePoint);
  if (!amount || !side) return null;
  const segments = polylineSegments(polyline);
  const primitives = segments.map((segment) => offsetSegment(segment, amount * side));
  if (primitives.some((primitive) => !primitive)) return null;
  const joined = primitives as OffsetPrimitive[];
  for (let index = 1; index < joined.length; index += 1) {
    if (!joinPrimitives(joined[index - 1], joined[index], segments[index].start)) return null;
  }
  if (polyline.closed && !joinPrimitives(joined.at(-1)!, joined[0], segments[0].start)) return null;

  const vertices = polyline.closed
    ? joined.map((primitive) => canonicalPoint(primitive.start))
    : [canonicalPoint(joined[0].start), ...joined.map((primitive) => canonicalPoint(primitive.end))];
  const bulges = joined.map(primitiveBulge);
  if (bulges.some((bulge) => bulge === null)) return null;
  const result = {
    bulges: bulges as number[],
    closed: polyline.closed,
    elevation: polyline.elevation,
    vertices,
    width: polyline.width ?? 0,
  };
  return polylineGeometryIsValid(result) ? result : null;
}

export function offsetGeometrySideDistance(point: PlanPoint, geometry: LineGeometry | PolylineGeometry | CircleGeometry | ArcGeometry): number | null {
  if ("start" in geometry && "end" in geometry) {
    const nearest = nearestPointOnSegment(point, geometry.start, geometry.end);
    return nearest?.distance ?? null;
  }
  if ("vertices" in geometry) {
    let closest = Number.POSITIVE_INFINITY;
    for (const segment of polylineSegments(geometry)) {
      const points = polylineSegmentPoints(segment, 96);
      for (let index = 1; index < points.length; index += 1) {
        const nearest = nearestPointOnSegment(point, points[index - 1], points[index]);
        if (nearest) closest = Math.min(closest, nearest.distance);
      }
    }
    return Number.isFinite(closest) ? closest : null;
  }
  return Math.abs(Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) - geometry.radius);
}
