import { arcGeometryIsValid, arcLength, type ArcGeometry } from "./cad-arc.ts";
import { lineGeometryIsValid, lineLength, type LineGeometry, type LinePoint } from "./cad-line.ts";
import {
  clonePolylineGeometry,
  polylineGeometryIsValid,
  polylineLength,
  polylineSegmentCircularGeometry,
  polylineSegments,
  type PolylineGeometry,
} from "./cad-polyline.ts";

export type LengthenEndpoint = "start" | "end";
export type LengthenMethod = "delta" | "total" | "percent" | "dynamic";
export type LengthenRequest =
  | { method: "delta" | "total" | "percent"; value: number }
  | { method: "dynamic"; point: LinePoint };

const MINIMUM_LENGTH = 1 / 16;
const MAXIMUM_SWEEP = 360 - 1e-7;

function normalizeAngle(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function counterclockwiseDistance(start: number, end: number): number {
  return normalizeAngle(end - start);
}

function directedSweep(start: number, end: number, counterclockwise: boolean): number {
  return counterclockwise ? counterclockwiseDistance(start, end) : counterclockwiseDistance(end, start);
}

function pointAngle(center: LinePoint, point: LinePoint): number {
  return normalizeAngle(Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI);
}

function pointOnCircle(center: LinePoint, radius: number, angle: number): LinePoint {
  const radians = angle * Math.PI / 180;
  return { x: center.x + Math.cos(radians) * radius, y: center.y + Math.sin(radians) * radius, z: center.z };
}

function requestedLength(current: number, request: Exclude<LengthenRequest, { method: "dynamic" }>): number | null {
  if (!Number.isFinite(request.value)) return null;
  if (request.method === "delta") return current + request.value;
  if (request.method === "total") return request.value;
  return current * request.value / 100;
}

function lineLengthFromDynamicPoint(line: LineGeometry, endpoint: LengthenEndpoint, point: LinePoint): number | null {
  const selected = endpoint === "start" ? line.start : line.end;
  const fixed = endpoint === "start" ? line.end : line.start;
  const current = Math.hypot(selected.x - fixed.x, selected.y - fixed.y, selected.z - fixed.z);
  if (current < MINIMUM_LENGTH) return null;
  const projection = ((point.x - fixed.x) * (selected.x - fixed.x) +
    (point.y - fixed.y) * (selected.y - fixed.y) +
    (point.z - fixed.z) * (selected.z - fixed.z)) / current;
  return projection;
}

export function lengthenLineGeometry(line: LineGeometry, endpoint: LengthenEndpoint, request: LengthenRequest): LineGeometry | null {
  if (!lineGeometryIsValid(line)) return null;
  const selected = endpoint === "start" ? line.start : line.end;
  const fixed = endpoint === "start" ? line.end : line.start;
  const current = lineLength(line);
  const targetLength = request.method === "dynamic"
    ? lineLengthFromDynamicPoint(line, endpoint, request.point)
    : requestedLength(current, request);
  if (targetLength === null || !Number.isFinite(targetLength) || targetLength < MINIMUM_LENGTH) return null;
  const scale = targetLength / current;
  const moved = {
    x: fixed.x + (selected.x - fixed.x) * scale,
    y: fixed.y + (selected.y - fixed.y) * scale,
    z: fixed.z + (selected.z - fixed.z) * scale,
  };
  const result = endpoint === "start" ? { start: moved, end: { ...fixed } } : { start: { ...fixed }, end: moved };
  return lineGeometryIsValid(result) ? result : null;
}

function arcSweepForRequest(arc: ArcGeometry, endpoint: LengthenEndpoint, request: LengthenRequest): number | null {
  if (request.method !== "dynamic") {
    const targetLength = requestedLength(arcLength(arc), request);
    return targetLength === null ? null : targetLength / arc.radius * 180 / Math.PI;
  }
  const angle = pointAngle(arc.center, request.point);
  return endpoint === "end"
    ? directedSweep(arc.startAngle, angle, arc.counterclockwise)
    : directedSweep(angle, arc.endAngle, arc.counterclockwise);
}

export function lengthenArcGeometry(arc: ArcGeometry, endpoint: LengthenEndpoint, request: LengthenRequest): ArcGeometry | null {
  if (!arcGeometryIsValid(arc)) return null;
  const sweep = arcSweepForRequest(arc, endpoint, request);
  if (sweep === null || !Number.isFinite(sweep) || sweep * Math.PI / 180 * arc.radius < MINIMUM_LENGTH || sweep >= MAXIMUM_SWEEP) return null;
  const result: ArcGeometry = { ...arc, center: { ...arc.center } };
  if (endpoint === "end") {
    result.endAngle = normalizeAngle(result.startAngle + (result.counterclockwise ? sweep : -sweep));
  } else {
    result.startAngle = normalizeAngle(result.endAngle + (result.counterclockwise ? -sweep : sweep));
  }
  return arcGeometryIsValid(result) ? result : null;
}

function terminalSegmentLength(polyline: PolylineGeometry, endpoint: LengthenEndpoint): number | null {
  const segments = polylineSegments(polyline);
  const segment = endpoint === "start" ? segments[0] : segments.at(-1);
  if (!segment) return null;
  const chord = Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
  if (Math.abs(segment.bulge) < 1e-10) return chord;
  const circular = polylineSegmentCircularGeometry(segment);
  return circular ? circular.radius * Math.abs(4 * Math.atan(segment.bulge)) : null;
}

function lengthenPolylineTerminalSegment(polyline: PolylineGeometry, endpoint: LengthenEndpoint, targetLength: number | null, dynamicPoint: LinePoint | null): PolylineGeometry | null {
  const result = clonePolylineGeometry(polyline);
  const segments = polylineSegments(polyline);
  const segmentIndex = endpoint === "start" ? 0 : segments.length - 1;
  const segment = segments[segmentIndex];
  if (!segment) return null;
  const selectedIndex = endpoint === "start" ? 0 : result.vertices.length - 1;

  if (Math.abs(segment.bulge) < 1e-10) {
    const geometry: LineGeometry = {
      start: { ...segment.start, z: polyline.elevation },
      end: { ...segment.end, z: polyline.elevation },
    };
    const request: LengthenRequest = dynamicPoint
      ? { method: "dynamic", point: dynamicPoint }
      : { method: "total", value: targetLength ?? 0 };
    const changed = lengthenLineGeometry(geometry, endpoint, request);
    if (!changed) return null;
    const moved = endpoint === "start" ? changed.start : changed.end;
    result.vertices[selectedIndex] = { x: moved.x, y: moved.y };
  } else {
    const circular = polylineSegmentCircularGeometry(segment);
    if (!circular) return null;
    let sweep: number;
    if (dynamicPoint) {
      const angle = pointAngle({ ...circular.center, z: polyline.elevation }, dynamicPoint);
      sweep = endpoint === "end"
        ? directedSweep(circular.startAngle, angle, circular.counterclockwise)
        : directedSweep(angle, circular.endAngle, circular.counterclockwise);
    } else {
      sweep = (targetLength ?? 0) / circular.radius * 180 / Math.PI;
    }
    if (!Number.isFinite(sweep) || sweep * Math.PI / 180 * circular.radius < MINIMUM_LENGTH || sweep >= MAXIMUM_SWEEP) return null;
    const selectedAngle = endpoint === "end"
      ? normalizeAngle(circular.startAngle + (circular.counterclockwise ? sweep : -sweep))
      : normalizeAngle(circular.endAngle + (circular.counterclockwise ? -sweep : sweep));
    const moved = pointOnCircle({ ...circular.center, z: polyline.elevation }, circular.radius, selectedAngle);
    result.vertices[selectedIndex] = { x: moved.x, y: moved.y };
    const signedSweep = (circular.counterclockwise ? 1 : -1) * sweep * Math.PI / 180;
    result.bulges![segmentIndex] = Math.tan(signedSweep / 4);
  }
  result.closed = false;
  return polylineGeometryIsValid(result) ? result : null;
}

export function lengthenPolylineGeometry(polyline: PolylineGeometry, endpoint: LengthenEndpoint, request: LengthenRequest): PolylineGeometry | null {
  if (!polylineGeometryIsValid(polyline) || polyline.closed) return null;
  if (request.method === "dynamic") return lengthenPolylineTerminalSegment(polyline, endpoint, null, request.point);
  const currentTotal = polylineLength(polyline);
  const currentTerminal = terminalSegmentLength(polyline, endpoint);
  const targetTotal = requestedLength(currentTotal, request);
  if (currentTerminal === null || targetTotal === null) return null;
  const targetTerminal = currentTerminal + targetTotal - currentTotal;
  return lengthenPolylineTerminalSegment(polyline, endpoint, targetTerminal, null);
}

export function closestLengthenEndpoint(start: LinePoint, end: LinePoint, pick: LinePoint): LengthenEndpoint {
  const startDistance = Math.hypot(pick.x - start.x, pick.y - start.y, pick.z - start.z);
  const endDistance = Math.hypot(pick.x - end.x, pick.y - end.y, pick.z - end.z);
  return startDistance <= endDistance ? "start" : "end";
}
