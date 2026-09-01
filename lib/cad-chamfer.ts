import {
  lineGeometryIsValid,
  type LineGeometry,
  type LinePoint,
} from "./cad-line.ts";

export type LineChamferResult = {
  chamfer: LineGeometry | null;
  first: LineGeometry;
  firstChamferPoint: LinePoint;
  intersection: LinePoint;
  second: LineGeometry;
  secondChamferPoint: LinePoint;
};

const EPSILON = 1e-8;

function stableNumber(value: number): number {
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function stablePoint(x: number, y: number, z: number): LinePoint {
  return { x: stableNumber(x), y: stableNumber(y), z: stableNumber(z) };
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function retainedDirection(
  line: LineGeometry,
  intersection: LinePoint,
  pick: LinePoint,
): { direction: { x: number; y: number }; retained: "start" | "end"; reach: number } | null {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  if (length < EPSILON) return null;
  const axis = { x: dx / length, y: dy / length };
  const pickProjection = (pick.x - intersection.x) * axis.x + (pick.y - intersection.y) * axis.y;
  const startProjection = (line.start.x - intersection.x) * axis.x + (line.start.y - intersection.y) * axis.y;
  const endProjection = (line.end.x - intersection.x) * axis.x + (line.end.y - intersection.y) * axis.y;
  let sign: 1 | -1;
  if (Math.abs(pickProjection) > EPSILON) sign = pickProjection > 0 ? 1 : -1;
  else {
    const startDistance = Math.hypot(pick.x - line.start.x, pick.y - line.start.y);
    const endDistance = Math.hypot(pick.x - line.end.x, pick.y - line.end.y);
    sign = endDistance <= startDistance ? 1 : -1;
  }
  const startReach = startProjection * sign;
  const endReach = endProjection * sign;
  return {
    direction: { x: axis.x * sign, y: axis.y * sign },
    retained: endReach >= startReach ? "end" : "start",
    reach: Math.max(startReach, endReach),
  };
}

function trimmedLine(line: LineGeometry, retained: "start" | "end", point: LinePoint): LineGeometry {
  return retained === "start"
    ? { start: { ...line.start }, end: point }
    : { start: point, end: { ...line.end } };
}

/**
 * Builds an exact planar chamfer between two infinite Line paths. The first
 * distance belongs to the first selected Line and the second distance belongs
 * to the second selected Line, matching the CAD Distance workflow.
 */
export function chamferLineGeometries(
  first: LineGeometry,
  second: LineGeometry,
  firstPick: LinePoint,
  secondPick: LinePoint,
  firstDistance: number,
  secondDistance: number,
): LineChamferResult | null {
  if (
    !lineGeometryIsValid(first) ||
    !lineGeometryIsValid(second) ||
    !Number.isFinite(firstDistance) ||
    !Number.isFinite(secondDistance) ||
    firstDistance < 0 ||
    secondDistance < 0
  ) return null;
  if (
    Math.abs(first.start.z - first.end.z) > EPSILON ||
    Math.abs(second.start.z - second.end.z) > EPSILON ||
    Math.abs(first.start.z - second.start.z) > EPSILON
  ) return null;

  const firstVector = { x: first.end.x - first.start.x, y: first.end.y - first.start.y };
  const secondVector = { x: second.end.x - second.start.x, y: second.end.y - second.start.y };
  const denominator = cross(firstVector.x, firstVector.y, secondVector.x, secondVector.y);
  if (Math.abs(denominator) < EPSILON) return null;
  const between = { x: second.start.x - first.start.x, y: second.start.y - first.start.y };
  const firstParameter = cross(between.x, between.y, secondVector.x, secondVector.y) / denominator;
  const intersection = stablePoint(
    first.start.x + firstVector.x * firstParameter,
    first.start.y + firstVector.y * firstParameter,
    first.start.z,
  );

  const firstSide = retainedDirection(first, intersection, firstPick);
  const secondSide = retainedDirection(second, intersection, secondPick);
  if (!firstSide || !secondSide) return null;
  if (firstSide.reach + EPSILON < firstDistance || secondSide.reach + EPSILON < secondDistance) return null;

  const firstChamferPoint = stablePoint(
    intersection.x + firstSide.direction.x * firstDistance,
    intersection.y + firstSide.direction.y * firstDistance,
    intersection.z,
  );
  const secondChamferPoint = stablePoint(
    intersection.x + secondSide.direction.x * secondDistance,
    intersection.y + secondSide.direction.y * secondDistance,
    intersection.z,
  );
  const firstResult = trimmedLine(first, firstSide.retained, firstChamferPoint);
  const secondResult = trimmedLine(second, secondSide.retained, secondChamferPoint);
  if (!lineGeometryIsValid(firstResult) || !lineGeometryIsValid(secondResult)) return null;

  const chamfer = firstDistance === 0 && secondDistance === 0
    ? null
    : { start: firstChamferPoint, end: secondChamferPoint } satisfies LineGeometry;
  if (chamfer && !lineGeometryIsValid(chamfer)) return null;
  return {
    chamfer,
    first: firstResult,
    firstChamferPoint,
    intersection,
    second: secondResult,
    secondChamferPoint,
  };
}
