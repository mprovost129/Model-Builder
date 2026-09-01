import { parseSignedArchitectural, snapToSixteenth } from "./architectural-units.ts";
import { MAXIMUM_COORDINATE } from "./box-model.ts";

export type PlanPoint = { x: number; y: number };
export type LinePoint = PlanPoint & { z: number };

export type LineGeometry = {
  end: LinePoint;
  start: LinePoint;
};

export const MINIMUM_LINE_LENGTH = 1 / 16;

export function clonePlanPoint(point: PlanPoint): PlanPoint {
  return { x: point.x, y: point.y };
}

export function cloneLinePoint(point: LinePoint): LinePoint {
  return { x: point.x, y: point.y, z: point.z };
}

export function cloneLineGeometry(line: LineGeometry): LineGeometry {
  return { end: cloneLinePoint(line.end), start: cloneLinePoint(line.start) };
}

export function lineLength(line: LineGeometry): number {
  return Math.hypot(
    line.end.x - line.start.x,
    line.end.y - line.start.y,
    line.end.z - line.start.z,
  );
}

export function lineAngle(line: LineGeometry): number {
  const raw = Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x) * 180 / Math.PI;
  const normalized = raw < 0 ? raw + 360 : raw;
  return Math.round(normalized * 1000) / 1000;
}

export function lineElevationAngle(line: LineGeometry): number {
  const horizontal = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
  const raw = Math.atan2(line.end.z - line.start.z, horizontal) * 180 / Math.PI;
  return Math.round(raw * 1000) / 1000;
}

export function lineMidpoint(line: LineGeometry): LinePoint {
  return {
    x: (line.start.x + line.end.x) / 2,
    y: (line.start.y + line.end.y) / 2,
    z: (line.start.z + line.end.z) / 2,
  };
}

export function snapPlanPoint(point: PlanPoint): PlanPoint {
  return { x: snapToSixteenth(point.x), y: snapToSixteenth(point.y) };
}

export function snapLinePoint(point: LinePoint): LinePoint {
  return {
    x: snapToSixteenth(point.x),
    y: snapToSixteenth(point.y),
    z: snapToSixteenth(point.z),
  };
}

export function planPointIsValid(point: PlanPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) &&
    Math.abs(point.x) <= MAXIMUM_COORDINATE && Math.abs(point.y) <= MAXIMUM_COORDINATE;
}

export function linePointIsValid(point: LinePoint): boolean {
  return planPointIsValid(point) && Number.isFinite(point.z) &&
    Math.abs(point.z) <= MAXIMUM_COORDINATE;
}

export function lineGeometryIsValid(line: LineGeometry): boolean {
  return linePointIsValid(line.start) && linePointIsValid(line.end) &&
    lineLength(line) >= MINIMUM_LINE_LENGTH;
}

export function lineFromLengthAngle(
  start: PlanPoint | LinePoint,
  length: number,
  angleDegrees: number,
): LineGeometry | null {
  return lineFromLengthAngles(start, length, angleDegrees, 0);
}

export function lineFromLengthAngles(
  start: PlanPoint | LinePoint,
  length: number,
  angleDegrees: number,
  elevationDegrees: number,
): LineGeometry | null {
  if (!Number.isFinite(length) || length < MINIMUM_LINE_LENGTH || !Number.isFinite(angleDegrees) || !Number.isFinite(elevationDegrees) || Math.abs(elevationDegrees) > 90) return null;
  const radians = angleDegrees * Math.PI / 180;
  const elevationRadians = elevationDegrees * Math.PI / 180;
  const startZ = "z" in start && typeof start.z === "number" ? start.z : 0;
  const horizontalLength = Math.cos(elevationRadians) * length;
  const line = {
    start: snapLinePoint({ ...start, z: startZ }),
    end: snapLinePoint({
      x: start.x + Math.cos(radians) * horizontalLength,
      y: start.y + Math.sin(radians) * horizontalLength,
      z: startZ + Math.sin(elevationRadians) * length,
    }),
  };
  return lineGeometryIsValid(line) ? line : null;
}

export function lineFromDirection(
  start: LinePoint,
  directionPoint: LinePoint,
  length: number,
): LineGeometry | null {
  if (!Number.isFinite(length) || length < MINIMUM_LINE_LENGTH) return null;
  const dx = directionPoint.x - start.x;
  const dy = directionPoint.y - start.y;
  const dz = directionPoint.z - start.z;
  const directionLength = Math.hypot(dx, dy, dz);
  if (directionLength < MINIMUM_LINE_LENGTH) return null;
  const scale = length / directionLength;
  const line = {
    start: snapLinePoint(start),
    end: snapLinePoint({
      x: start.x + dx * scale,
      y: start.y + dy * scale,
      z: start.z + dz * scale,
    }),
  };
  return lineGeometryIsValid(line) ? line : null;
}

function angularDifference(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export function snapLineDirection(
  start: LinePoint,
  candidate: LinePoint,
  angles: number[],
  toleranceDegrees = 4,
): { angle: number | null; point: LinePoint } {
  const dx = candidate.x - start.x;
  const dy = candidate.y - start.y;
  const horizontalLength = Math.hypot(dx, dy);
  if (horizontalLength < MINIMUM_LINE_LENGTH || !angles.length) {
    return { angle: null, point: snapLinePoint(candidate) };
  }
  const rawAngle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  const nearest = angles.reduce<{ angle: number; difference: number } | null>((best, angle) => {
    const normalized = ((angle % 360) + 360) % 360;
    const difference = angularDifference(rawAngle, normalized);
    return !best || difference < best.difference ? { angle: normalized, difference } : best;
  }, null);
  if (!nearest || nearest.difference > toleranceDegrees) {
    return { angle: null, point: snapLinePoint(candidate) };
  }
  const radians = nearest.angle * Math.PI / 180;
  return {
    angle: nearest.angle,
    point: snapLinePoint({
      x: start.x + Math.cos(radians) * horizontalLength,
      y: start.y + Math.sin(radians) * horizontalLength,
      z: candidate.z,
    }),
  };
}

export function parseLineCoordinate(
  input: string,
  defaultZ = 0,
  relativeTo: LinePoint | null = null,
): LinePoint | null {
  let value = input.trim();
  const relative = value.startsWith("@");
  if (relative) value = value.slice(1).trim();
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 2 && parts.length !== 3) return null;
  const parsed = parts.map(parseSignedArchitectural);
  if (parsed.some((coordinate) => coordinate === null)) return null;
  const [x, y] = parsed as number[];
  const z = parts.length === 3 ? parsed[2] as number : relative ? 0 : defaultZ;
  const origin = relative ? relativeTo : null;
  if (relative && !origin) return null;
  const point = snapLinePoint({
    x: x + (origin?.x ?? 0),
    y: y + (origin?.y ?? 0),
    z: z + (origin?.z ?? 0),
  });
  return linePointIsValid(point) ? point : null;
}

export function moveLineGrip(
  line: LineGeometry,
  grip: "start" | "midpoint" | "end",
  target: LinePoint,
): LineGeometry | null {
  const snapped = snapLinePoint(target);
  let next: LineGeometry;
  if (grip === "start") next = { start: snapped, end: cloneLinePoint(line.end) };
  else if (grip === "end") next = { start: cloneLinePoint(line.start), end: snapped };
  else {
    const midpoint = lineMidpoint(line);
    const dx = snapped.x - midpoint.x;
    const dy = snapped.y - midpoint.y;
    next = {
      start: snapLinePoint({ x: line.start.x + dx, y: line.start.y + dy, z: line.start.z + snapped.z - midpoint.z }),
      end: snapLinePoint({ x: line.end.x + dx, y: line.end.y + dy, z: line.end.z + snapped.z - midpoint.z }),
    };
  }
  return lineGeometryIsValid(next) ? next : null;
}

export function lineGeometriesEqual(a: LineGeometry, b: LineGeometry): boolean {
  return a.start.x === b.start.x && a.start.y === b.start.y && a.start.z === b.start.z &&
    a.end.x === b.end.x && a.end.y === b.end.y && a.end.z === b.end.z;
}
