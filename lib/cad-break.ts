import { arcGeometryIsValid, arcPointAtFraction, arcSweepAngle, normalizeArcAngle, type ArcGeometry } from "./cad-arc.ts";
import type { CircleGeometry } from "./cad-circle.ts";
import { lineGeometryIsValid, type LineGeometry, type LinePoint, type PlanPoint } from "./cad-line.ts";
import {
  polylineGeometryIsValid,
  polylineSegmentCircularGeometry,
  polylineSegments,
  type PlanSegment,
  type PolylineGeometry,
} from "./cad-polyline.ts";

const FRACTION_EPSILON = 1e-8;
const MINIMUM_LENGTH = 1 / 16;

function stableNumber(value: number): number {
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function stablePoint(point: LinePoint): LinePoint {
  return { x: stableNumber(point.x), y: stableNumber(point.y), z: stableNumber(point.z) };
}

function stablePlanPoint(point: PlanPoint): PlanPoint {
  return { x: stableNumber(point.x), y: stableNumber(point.y) };
}

function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lineFractionAtPoint(line: LineGeometry, pick: LinePoint): number {
  const delta = {
    x: line.end.x - line.start.x,
    y: line.end.y - line.start.y,
    z: line.end.z - line.start.z,
  };
  const lengthSquared = delta.x ** 2 + delta.y ** 2 + delta.z ** 2;
  if (lengthSquared <= FRACTION_EPSILON) return 0;
  return clampFraction(((pick.x - line.start.x) * delta.x + (pick.y - line.start.y) * delta.y + (pick.z - line.start.z) * delta.z) / lengthSquared);
}

function linePointAtFraction(line: LineGeometry, fraction: number): LinePoint {
  return stablePoint({
    x: line.start.x + (line.end.x - line.start.x) * fraction,
    y: line.start.y + (line.end.y - line.start.y) * fraction,
    z: line.start.z + (line.end.z - line.start.z) * fraction,
  });
}

function lineSlice(line: LineGeometry, startFraction: number, endFraction: number): LineGeometry | null {
  const geometry = { start: linePointAtFraction(line, startFraction), end: linePointAtFraction(line, endFraction) };
  return lineGeometryIsValid(geometry) ? geometry : null;
}

export function breakLineAtPointGeometry(line: LineGeometry, pick: LinePoint): LineGeometry[] | null {
  const fraction = lineFractionAtPoint(line, pick);
  if (fraction <= FRACTION_EPSILON || fraction >= 1 - FRACTION_EPSILON) return null;
  const pieces = [lineSlice(line, 0, fraction), lineSlice(line, fraction, 1)];
  return pieces.every(Boolean) ? pieces as LineGeometry[] : null;
}

export function breakLineGeometry(line: LineGeometry, firstPick: LinePoint, secondPick: LinePoint): LineGeometry[] | null {
  const first = lineFractionAtPoint(line, firstPick);
  const second = lineFractionAtPoint(line, secondPick);
  const lower = Math.min(first, second);
  const upper = Math.max(first, second);
  if (upper - lower <= FRACTION_EPSILON) return null;
  const pieces = [lower > FRACTION_EPSILON ? lineSlice(line, 0, lower) : null, upper < 1 - FRACTION_EPSILON ? lineSlice(line, upper, 1) : null].filter(Boolean) as LineGeometry[];
  return pieces.length ? pieces : null;
}

function directedRadians(start: number, end: number, counterclockwise: boolean): number {
  const tau = Math.PI * 2;
  const normalized = ((counterclockwise ? end - start : start - end) % tau + tau) % tau;
  return normalized;
}

function arcFractionAtPoint(arc: ArcGeometry, pick: LinePoint): number {
  const start = arc.startAngle * Math.PI / 180;
  const angle = Math.atan2(pick.y - arc.center.y, pick.x - arc.center.x);
  const sweep = arcSweepAngle(arc) * Math.PI / 180;
  return clampFraction(directedRadians(start, angle, arc.counterclockwise) / sweep);
}

function arcSlice(arc: ArcGeometry, startFraction: number, endFraction: number): ArcGeometry | null {
  if (endFraction - startFraction <= FRACTION_EPSILON) return null;
  const startPoint = arcPointAtFraction(arc, startFraction);
  const endPoint = arcPointAtFraction(arc, endFraction);
  const geometry: ArcGeometry = {
    center: { ...arc.center },
    radius: arc.radius,
    startAngle: normalizeArcAngle(Math.atan2(startPoint.y - arc.center.y, startPoint.x - arc.center.x) * 180 / Math.PI),
    endAngle: normalizeArcAngle(Math.atan2(endPoint.y - arc.center.y, endPoint.x - arc.center.x) * 180 / Math.PI),
    counterclockwise: arc.counterclockwise,
  };
  return arcGeometryIsValid(geometry) ? geometry : null;
}

export function breakArcAtPointGeometry(arc: ArcGeometry, pick: LinePoint): ArcGeometry[] | null {
  const fraction = arcFractionAtPoint(arc, pick);
  if (fraction <= FRACTION_EPSILON || fraction >= 1 - FRACTION_EPSILON) return null;
  const pieces = [arcSlice(arc, 0, fraction), arcSlice(arc, fraction, 1)];
  return pieces.every(Boolean) ? pieces as ArcGeometry[] : null;
}

export function breakArcGeometry(arc: ArcGeometry, firstPick: LinePoint, secondPick: LinePoint): ArcGeometry[] | null {
  const first = arcFractionAtPoint(arc, firstPick);
  const second = arcFractionAtPoint(arc, secondPick);
  const lower = Math.min(first, second);
  const upper = Math.max(first, second);
  if (upper - lower <= FRACTION_EPSILON) return null;
  const pieces = [lower > FRACTION_EPSILON ? arcSlice(arc, 0, lower) : null, upper < 1 - FRACTION_EPSILON ? arcSlice(arc, upper, 1) : null].filter(Boolean) as ArcGeometry[];
  return pieces.length ? pieces : null;
}

export function breakCircleGeometry(circle: CircleGeometry, firstPick: LinePoint, secondPick: LinePoint): ArcGeometry | null {
  const firstAngle = normalizeArcAngle(Math.atan2(firstPick.y - circle.center.y, firstPick.x - circle.center.x) * 180 / Math.PI);
  const secondAngle = normalizeArcAngle(Math.atan2(secondPick.y - circle.center.y, secondPick.x - circle.center.x) * 180 / Math.PI);
  const removedSweep = normalizeArcAngle(secondAngle - firstAngle);
  if (removedSweep <= FRACTION_EPSILON || removedSweep >= 360 - FRACTION_EPSILON) return null;
  const geometry: ArcGeometry = {
    center: { ...circle.center },
    radius: circle.radius,
    startAngle: secondAngle,
    endAngle: firstAngle,
    counterclockwise: true,
  };
  return arcGeometryIsValid(geometry) ? geometry : null;
}

type PathLocation = { distance: number; segmentIndex: number; fraction: number };

function segmentLength(segment: PlanSegment): number {
  const chord = Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
  if (Math.abs(segment.bulge) < 1e-10) return chord;
  const sweep = Math.abs(4 * Math.atan(segment.bulge));
  const radius = chord * (1 + segment.bulge ** 2) / (4 * Math.abs(segment.bulge));
  return radius * sweep;
}

function nearestSegmentFraction(segment: PlanSegment, pick: PlanPoint): number {
  const circular = polylineSegmentCircularGeometry(segment);
  if (circular) {
    const start = circular.startAngle * Math.PI / 180;
    const angle = Math.atan2(pick.y - circular.center.y, pick.x - circular.center.x);
    const sweep = Math.abs(4 * Math.atan(segment.bulge));
    const fraction = directedRadians(start, angle, circular.counterclockwise) / sweep;
    if (fraction >= 0 && fraction <= 1) return fraction;
    const startDistance = Math.hypot(pick.x - segment.start.x, pick.y - segment.start.y);
    const endDistance = Math.hypot(pick.x - segment.end.x, pick.y - segment.end.y);
    return startDistance <= endDistance ? 0 : 1;
  }
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx ** 2 + dy ** 2;
  return lengthSquared <= FRACTION_EPSILON ? 0 : clampFraction(((pick.x - segment.start.x) * dx + (pick.y - segment.start.y) * dy) / lengthSquared);
}

function pointOnSegment(segment: PlanSegment, fraction: number): PlanPoint {
  const circular = polylineSegmentCircularGeometry(segment);
  if (!circular) return stablePlanPoint({
    x: segment.start.x + (segment.end.x - segment.start.x) * fraction,
    y: segment.start.y + (segment.end.y - segment.start.y) * fraction,
  });
  const sweep = 4 * Math.atan(segment.bulge);
  const angle = circular.startAngle * Math.PI / 180 + sweep * fraction;
  return stablePlanPoint({
    x: circular.center.x + Math.cos(angle) * circular.radius,
    y: circular.center.y + Math.sin(angle) * circular.radius,
  });
}

function nearestPathLocation(segments: PlanSegment[], pick: PlanPoint): PathLocation {
  let cumulative = 0;
  let best = { distance: 0, segmentIndex: 0, fraction: 0, pickDistance: Number.POSITIVE_INFINITY };
  segments.forEach((segment, segmentIndex) => {
    const length = segmentLength(segment);
    const fraction = nearestSegmentFraction(segment, pick);
    const point = pointOnSegment(segment, fraction);
    const pickDistance = Math.hypot(point.x - pick.x, point.y - pick.y);
    if (pickDistance < best.pickDistance) best = { distance: cumulative + length * fraction, segmentIndex, fraction, pickDistance };
    cumulative += length;
  });
  return { distance: best.distance, segmentIndex: best.segmentIndex, fraction: best.fraction };
}

function sliceSegment(segment: PlanSegment, startFraction: number, endFraction: number): PlanSegment | null {
  if (endFraction - startFraction <= FRACTION_EPSILON) return null;
  const sweep = 4 * Math.atan(segment.bulge) * (endFraction - startFraction);
  const sliced: PlanSegment = {
    start: pointOnSegment(segment, startFraction),
    end: pointOnSegment(segment, endFraction),
    bulge: Math.abs(segment.bulge) < 1e-10 ? 0 : stableNumber(Math.tan(sweep / 4)),
  };
  return Math.hypot(sliced.end.x - sliced.start.x, sliced.end.y - sliced.start.y) >= MINIMUM_LENGTH ? sliced : null;
}

function pathSlice(segments: PlanSegment[], startDistance: number, endDistance: number): PlanSegment[] {
  const result: PlanSegment[] = [];
  let cumulative = 0;
  segments.forEach((segment) => {
    const length = segmentLength(segment);
    const overlapStart = Math.max(startDistance, cumulative);
    const overlapEnd = Math.min(endDistance, cumulative + length);
    if (overlapEnd - overlapStart > FRACTION_EPSILON) {
      const sliced = sliceSegment(segment, (overlapStart - cumulative) / length, (overlapEnd - cumulative) / length);
      if (sliced) result.push(sliced);
    }
    cumulative += length;
  });
  return result;
}

function segmentsToPolyline(source: PolylineGeometry, segments: PlanSegment[]): PolylineGeometry | null {
  if (!segments.length) return null;
  const geometry: PolylineGeometry = {
    vertices: [stablePlanPoint(segments[0].start), ...segments.map((segment) => stablePlanPoint(segment.end))],
    bulges: segments.map((segment) => stableNumber(segment.bulge)),
    closed: false,
    elevation: source.elevation,
    width: source.width ?? 0,
  };
  return polylineGeometryIsValid(geometry) ? geometry : null;
}

function concatenateSegments(first: PlanSegment[], second: PlanSegment[]): PlanSegment[] {
  if (!first.length) return second;
  if (!second.length) return first;
  const end = first.at(-1)!.end;
  const start = second[0].start;
  if (Math.hypot(end.x - start.x, end.y - start.y) <= FRACTION_EPSILON) second[0] = { ...second[0], start: { ...end } };
  return [...first, ...second];
}

export function breakPolylineAtPointGeometry(polyline: PolylineGeometry, pick: LinePoint): PolylineGeometry[] | null {
  if (polyline.closed) return null;
  const segments = polylineSegments(polyline);
  const total = segments.reduce((sum, segment) => sum + segmentLength(segment), 0);
  const location = nearestPathLocation(segments, pick);
  if (location.distance <= FRACTION_EPSILON || location.distance >= total - FRACTION_EPSILON) return null;
  const pieces = [segmentsToPolyline(polyline, pathSlice(segments, 0, location.distance)), segmentsToPolyline(polyline, pathSlice(segments, location.distance, total))];
  return pieces.every(Boolean) ? pieces as PolylineGeometry[] : null;
}

export function breakPolylineGeometry(polyline: PolylineGeometry, firstPick: LinePoint, secondPick: LinePoint): PolylineGeometry[] | null {
  const segments = polylineSegments(polyline);
  const total = segments.reduce((sum, segment) => sum + segmentLength(segment), 0);
  const first = nearestPathLocation(segments, firstPick).distance;
  const second = nearestPathLocation(segments, secondPick).distance;
  if (Math.abs(first - second) <= FRACTION_EPSILON) return null;
  if (polyline.closed) {
    const remaining = second > first
      ? concatenateSegments(pathSlice(segments, second, total), pathSlice(segments, 0, first))
      : pathSlice(segments, second, first);
    const geometry = segmentsToPolyline(polyline, remaining);
    return geometry ? [geometry] : null;
  }
  const lower = Math.min(first, second);
  const upper = Math.max(first, second);
  const pieces = [segmentsToPolyline(polyline, pathSlice(segments, 0, lower)), segmentsToPolyline(polyline, pathSlice(segments, upper, total))].filter(Boolean) as PolylineGeometry[];
  return pieces.length ? pieces : null;
}
