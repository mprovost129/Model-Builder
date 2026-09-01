import { snapToSixteenth } from "./architectural-units.ts";
import { MAXIMUM_COORDINATE } from "./box-model.ts";
import type { LinePoint } from "./cad-line.ts";

export type ArcGeometry = {
  center: LinePoint;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterclockwise: boolean;
};

export type ArcGrip = "center" | "start" | "midpoint" | "end";

export type ArcMethod =
  | "three-point"
  | "start-center-end"
  | "start-center-angle"
  | "start-center-length"
  | "start-end-angle"
  | "start-end-direction"
  | "start-end-radius"
  | "center-start-end"
  | "center-start-angle"
  | "center-start-length"
  | "continue";

export type ArcMethodDefinition = {
  description: string;
  label: string;
  method: ArcMethod;
};

export const ARC_METHODS: ArcMethodDefinition[] = [
  { method: "three-point", label: "3-Point", description: "Start, point on arc, and endpoint" },
  { method: "start-center-end", label: "Start, Center, End", description: "Start point, center point, and endpoint" },
  { method: "start-center-angle", label: "Start, Center, Angle", description: "Start point, center point, and included angle" },
  { method: "start-center-length", label: "Start, Center, Length", description: "Start point, center point, and chord length" },
  { method: "start-end-angle", label: "Start, End, Angle", description: "Start point, endpoint, and included angle" },
  { method: "start-end-direction", label: "Start, End, Direction", description: "Start point, endpoint, and starting tangent direction" },
  { method: "start-end-radius", label: "Start, End, Radius", description: "Start point, endpoint, and radius" },
  { method: "center-start-end", label: "Center, Start, End", description: "Center point, start point, and endpoint" },
  { method: "center-start-angle", label: "Center, Start, Angle", description: "Center point, start point, and included angle" },
  { method: "center-start-length", label: "Center, Start, Length", description: "Center point, start point, and chord length" },
  { method: "continue", label: "Continue", description: "Tangent from the last line, arc, or open polyline" },
];

const MINIMUM_ARC_RADIUS = 1 / 16;
const ANGLE_EPSILON = 1e-7;

function stableNumber(value: number): number {
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function snapPoint(point: LinePoint): LinePoint {
  return { x: snapToSixteenth(point.x), y: snapToSixteenth(point.y), z: snapToSixteenth(point.z) };
}

function angleFrom(center: LinePoint, point: LinePoint): number {
  return normalizeArcAngle(Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI);
}

function arcFromCenterAngles(center: LinePoint, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean): ArcGeometry | null {
  const arc: ArcGeometry = {
    center: { x: stableNumber(center.x), y: stableNumber(center.y), z: snapToSixteenth(center.z) },
    radius: stableNumber(radius),
    startAngle: normalizeArcAngle(startAngle),
    endAngle: normalizeArcAngle(endAngle),
    counterclockwise,
  };
  return arcGeometryIsValid(arc) ? arc : null;
}

export function normalizeArcAngle(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  return stableNumber(normalized);
}

function counterclockwiseDistance(start: number, end: number): number {
  return normalizeArcAngle(end - start);
}

export function arcSweepAngle(arc: ArcGeometry): number {
  return arc.counterclockwise
    ? counterclockwiseDistance(arc.startAngle, arc.endAngle)
    : counterclockwiseDistance(arc.endAngle, arc.startAngle);
}

export function arcGeometryIsValid(arc: ArcGeometry): boolean {
  const values = [arc.center.x, arc.center.y, arc.center.z, arc.radius, arc.startAngle, arc.endAngle];
  if (!values.every(Number.isFinite) || typeof arc.counterclockwise !== "boolean") return false;
  if (Math.abs(arc.center.x) > MAXIMUM_COORDINATE || Math.abs(arc.center.y) > MAXIMUM_COORDINATE || Math.abs(arc.center.z) > MAXIMUM_COORDINATE) return false;
  if (Math.abs(arc.center.z * 16 - Math.round(arc.center.z * 16)) > 1e-8) return false;
  if (arc.radius < MINIMUM_ARC_RADIUS || arc.radius > MAXIMUM_COORDINATE) return false;
  if (Math.abs(arc.center.x) + arc.radius > MAXIMUM_COORDINATE || Math.abs(arc.center.y) + arc.radius > MAXIMUM_COORDINATE) return false;
  if (arc.startAngle < 0 || arc.startAngle >= 360 || arc.endAngle < 0 || arc.endAngle >= 360) return false;
  const sweep = arcSweepAngle(arc);
  return sweep > ANGLE_EPSILON && sweep < 360 - ANGLE_EPSILON;
}

export function cloneArcGeometry(arc: ArcGeometry): ArcGeometry {
  return { ...arc, center: { ...arc.center } };
}

export function arcGeometriesEqual(a: ArcGeometry, b: ArcGeometry): boolean {
  return a.center.x === b.center.x && a.center.y === b.center.y && a.center.z === b.center.z &&
    a.radius === b.radius && a.startAngle === b.startAngle && a.endAngle === b.endAngle &&
    a.counterclockwise === b.counterclockwise;
}

export function arcPointAtFraction(arc: ArcGeometry, fraction: number): LinePoint {
  const sweep = arcSweepAngle(arc);
  const angle = arc.counterclockwise
    ? arc.startAngle + sweep * fraction
    : arc.startAngle - sweep * fraction;
  const radians = angle * Math.PI / 180;
  return {
    x: stableNumber(arc.center.x + Math.cos(radians) * arc.radius),
    y: stableNumber(arc.center.y + Math.sin(radians) * arc.radius),
    z: arc.center.z,
  };
}

export function arcFromThreePoints(startInput: LinePoint, throughInput: LinePoint, endInput: LinePoint): ArcGeometry | null {
  const start = snapPoint(startInput);
  const through = snapPoint(throughInput);
  const end = snapPoint(endInput);
  if (start.z !== through.z || start.z !== end.z) return null;

  const denominator = 2 * (start.x * (through.y - end.y) + through.x * (end.y - start.y) + end.x * (start.y - through.y));
  if (Math.abs(denominator) < 1e-8) return null;
  const startSquared = start.x ** 2 + start.y ** 2;
  const throughSquared = through.x ** 2 + through.y ** 2;
  const endSquared = end.x ** 2 + end.y ** 2;
  const centerX = (startSquared * (through.y - end.y) + throughSquared * (end.y - start.y) + endSquared * (start.y - through.y)) / denominator;
  const centerY = (startSquared * (end.x - through.x) + throughSquared * (start.x - end.x) + endSquared * (through.x - start.x)) / denominator;
  const radius = Math.hypot(start.x - centerX, start.y - centerY);
  const angleFor = (point: LinePoint) => normalizeArcAngle(Math.atan2(point.y - centerY, point.x - centerX) * 180 / Math.PI);
  const startAngle = angleFor(start);
  const throughAngle = angleFor(through);
  const endAngle = angleFor(end);
  const endCounterclockwiseDistance = counterclockwiseDistance(startAngle, endAngle);
  const throughCounterclockwiseDistance = counterclockwiseDistance(startAngle, throughAngle);
  const counterclockwise = throughCounterclockwiseDistance > ANGLE_EPSILON && throughCounterclockwiseDistance < endCounterclockwiseDistance;
  const arc: ArcGeometry = {
    center: { x: stableNumber(centerX), y: stableNumber(centerY), z: start.z },
    radius: stableNumber(radius),
    startAngle,
    endAngle,
    counterclockwise,
  };
  return arcGeometryIsValid(arc) ? arc : null;
}

export function arcFromStartCenterEnd(startInput: LinePoint, centerInput: LinePoint, endInput: LinePoint): ArcGeometry | null {
  const start = snapPoint(startInput);
  const center = snapPoint(centerInput);
  const end = snapPoint(endInput);
  if (start.z !== center.z || start.z !== end.z) return null;
  const radius = Math.hypot(start.x - center.x, start.y - center.y);
  if (radius < MINIMUM_ARC_RADIUS || Math.hypot(end.x - center.x, end.y - center.y) < MINIMUM_ARC_RADIUS) return null;
  return arcFromCenterAngles(center, radius, angleFrom(center, start), angleFrom(center, end), true);
}

export function arcFromCenterStartEnd(center: LinePoint, start: LinePoint, end: LinePoint): ArcGeometry | null {
  return arcFromStartCenterEnd(start, center, end);
}

export function arcFromStartCenterAngle(startInput: LinePoint, centerInput: LinePoint, includedAngle: number): ArcGeometry | null {
  const start = snapPoint(startInput);
  const center = snapPoint(centerInput);
  if (start.z !== center.z || !Number.isFinite(includedAngle) || Math.abs(includedAngle) <= ANGLE_EPSILON || Math.abs(includedAngle) >= 360 - ANGLE_EPSILON) return null;
  const radius = Math.hypot(start.x - center.x, start.y - center.y);
  const startAngle = angleFrom(center, start);
  return arcFromCenterAngles(center, radius, startAngle, startAngle + includedAngle, includedAngle > 0);
}

export function arcFromCenterStartAngle(center: LinePoint, start: LinePoint, includedAngle: number): ArcGeometry | null {
  return arcFromStartCenterAngle(start, center, includedAngle);
}

export function arcFromStartCenterLength(startInput: LinePoint, centerInput: LinePoint, chordLength: number): ArcGeometry | null {
  const start = snapPoint(startInput);
  const center = snapPoint(centerInput);
  if (start.z !== center.z || !Number.isFinite(chordLength) || chordLength < MINIMUM_ARC_RADIUS) return null;
  const radius = Math.hypot(start.x - center.x, start.y - center.y);
  if (radius < MINIMUM_ARC_RADIUS || chordLength > radius * 2 + 1e-8) return null;
  const includedAngle = 2 * Math.asin(Math.min(1, chordLength / (2 * radius))) * 180 / Math.PI;
  return arcFromStartCenterAngle(start, center, includedAngle);
}

export function arcFromCenterStartLength(center: LinePoint, start: LinePoint, chordLength: number): ArcGeometry | null {
  return arcFromStartCenterLength(start, center, chordLength);
}

export function arcFromStartEndAngle(startInput: LinePoint, endInput: LinePoint, includedAngle: number): ArcGeometry | null {
  const start = snapPoint(startInput);
  const end = snapPoint(endInput);
  if (start.z !== end.z || !Number.isFinite(includedAngle) || Math.abs(includedAngle) <= ANGLE_EPSILON || Math.abs(includedAngle) >= 360 - ANGLE_EPSILON) return null;
  const chordX = end.x - start.x;
  const chordY = end.y - start.y;
  const chordLength = Math.hypot(chordX, chordY);
  if (chordLength < MINIMUM_ARC_RADIUS) return null;
  const radians = includedAngle * Math.PI / 180;
  const tangent = Math.tan(radians / 2);
  if (Math.abs(tangent) < 1e-10) return null;
  const offset = chordLength / (2 * tangent);
  const center = {
    x: stableNumber((start.x + end.x) / 2 - chordY / chordLength * offset),
    y: stableNumber((start.y + end.y) / 2 + chordX / chordLength * offset),
    z: start.z,
  };
  return arcFromCenterAngles(center, Math.hypot(start.x - center.x, start.y - center.y), angleFrom(center, start), angleFrom(center, end), includedAngle > 0);
}

export function arcFromStartEndDirection(startInput: LinePoint, endInput: LinePoint, directionInput: LinePoint): ArcGeometry | null {
  const start = snapPoint(startInput);
  const end = snapPoint(endInput);
  const direction = { x: directionInput.x, y: directionInput.y, z: snapToSixteenth(directionInput.z) };
  if (start.z !== end.z || start.z !== direction.z) return null;
  const tangentX = direction.x - start.x;
  const tangentY = direction.y - start.y;
  const tangentLength = Math.hypot(tangentX, tangentY);
  const chordX = end.x - start.x;
  const chordY = end.y - start.y;
  const chordLength = Math.hypot(chordX, chordY);
  if (tangentLength < MINIMUM_ARC_RADIUS || chordLength < MINIMUM_ARC_RADIUS) return null;
  const unitTangentX = tangentX / tangentLength;
  const unitTangentY = tangentY / tangentLength;
  const normalX = -unitTangentY;
  const normalY = unitTangentX;
  const denominator = 2 * (chordX * normalX + chordY * normalY);
  if (Math.abs(denominator) < 1e-8) return null;
  const signedRadius = chordLength ** 2 / denominator;
  const center = {
    x: stableNumber(start.x + normalX * signedRadius),
    y: stableNumber(start.y + normalY * signedRadius),
    z: start.z,
  };
  const radialX = start.x - center.x;
  const radialY = start.y - center.y;
  const ccwTangentX = -radialY;
  const ccwTangentY = radialX;
  const counterclockwise = ccwTangentX * unitTangentX + ccwTangentY * unitTangentY > 0;
  return arcFromCenterAngles(center, Math.abs(signedRadius), angleFrom(center, start), angleFrom(center, end), counterclockwise);
}

export function arcFromStartEndDirectionAngle(start: LinePoint, end: LinePoint, directionAngle: number): ArcGeometry | null {
  if (!Number.isFinite(directionAngle)) return null;
  const radians = directionAngle * Math.PI / 180;
  return arcFromStartEndDirection(start, end, { x: start.x + Math.cos(radians) * 12, y: start.y + Math.sin(radians) * 12, z: start.z });
}

export function arcFromStartEndRadius(startInput: LinePoint, endInput: LinePoint, radius: number): ArcGeometry | null {
  const start = snapPoint(startInput);
  const end = snapPoint(endInput);
  if (start.z !== end.z || !Number.isFinite(radius) || radius < MINIMUM_ARC_RADIUS) return null;
  const chordX = end.x - start.x;
  const chordY = end.y - start.y;
  const chordLength = Math.hypot(chordX, chordY);
  if (chordLength < MINIMUM_ARC_RADIUS || chordLength > radius * 2 + 1e-8) return null;
  const offset = Math.sqrt(Math.max(0, radius ** 2 - (chordLength / 2) ** 2));
  const center = {
    x: stableNumber((start.x + end.x) / 2 - chordY / chordLength * offset),
    y: stableNumber((start.y + end.y) / 2 + chordX / chordLength * offset),
    z: start.z,
  };
  return arcFromCenterAngles(center, radius, angleFrom(center, start), angleFrom(center, end), true);
}

export function arcLength(arc: ArcGeometry): number {
  return arc.radius * arcSweepAngle(arc) * Math.PI / 180;
}

export function arcGripPoints(arc: ArcGeometry): Array<{ grip: ArcGrip; point: LinePoint }> {
  return [
    { grip: "center", point: { ...arc.center } },
    { grip: "start", point: arcPointAtFraction(arc, 0) },
    { grip: "midpoint", point: arcPointAtFraction(arc, 0.5) },
    { grip: "end", point: arcPointAtFraction(arc, 1) },
  ];
}

export function moveArcGrip(arc: ArcGeometry, grip: ArcGrip, target: LinePoint): ArcGeometry | null {
  if (grip === "center") {
    const center = { x: snapToSixteenth(target.x), y: snapToSixteenth(target.y), z: snapToSixteenth(target.z) };
    const moved = { ...arc, center };
    return arcGeometryIsValid(moved) ? moved : null;
  }
  const points = {
    start: arcPointAtFraction(arc, 0),
    midpoint: arcPointAtFraction(arc, 0.5),
    end: arcPointAtFraction(arc, 1),
  };
  points[grip] = { x: target.x, y: target.y, z: arc.center.z };
  return arcFromThreePoints(points.start, points.midpoint, points.end);
}
