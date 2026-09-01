import { parseArchitectural, snapToSixteenth } from "./architectural-units.ts";
import { MAXIMUM_COORDINATE } from "./box-model.ts";
import { arcFromThreePoints, arcSweepAngle } from "./cad-arc.ts";
import { clonePlanPoint, planPointIsValid, snapPlanPoint, type PlanPoint } from "./cad-line.ts";

export type PlanSegment = { bulge: number; end: PlanPoint; start: PlanPoint };

export type PolylineGeometry = {
  bulges?: number[];
  closed: boolean;
  elevation: number;
  vertices: PlanPoint[];
  width?: number;
};

export type RectangleDimensions = {
  area: number;
  height: number;
  perimeter: number;
  width: number;
};

export type RectangleAreaBasis = "length" | "width";

export type RectangleConstructionOptions = {
  chamferX?: number;
  chamferY?: number;
  filletRadius?: number;
  rotation?: number;
  width?: number;
};

export type RectangleGrip =
  | { index: number; kind: "corner" | "edge" }
  | { kind: "center" };

export const MAXIMUM_POLYLINE_VERTICES = 1000;

export function clonePolylineGeometry(polyline: PolylineGeometry): PolylineGeometry {
  return {
    bulges: normalizedPolylineBulges(polyline),
    closed: polyline.closed,
    elevation: polyline.elevation,
    vertices: polyline.vertices.map(clonePlanPoint),
    width: snapToSixteenth(polyline.width ?? 0),
  };
}

export function polylineSegments(polyline: PolylineGeometry): PlanSegment[] {
  const bulges = normalizedPolylineBulges(polyline);
  const segments = polyline.vertices.slice(1).map((end, index) => ({ bulge: bulges[index] ?? 0, start: polyline.vertices[index], end }));
  if (polyline.closed && polyline.vertices.length > 2) {
    segments.push({ bulge: bulges.at(-1) ?? 0, start: polyline.vertices.at(-1)!, end: polyline.vertices[0] });
  }
  return segments;
}

export function polylineSegmentCount(polyline: PolylineGeometry): number {
  return Math.max(0, polyline.vertices.length - 1 + (polyline.closed && polyline.vertices.length > 2 ? 1 : 0));
}

export function normalizedPolylineBulges(polyline: PolylineGeometry): number[] {
  const count = polylineSegmentCount(polyline);
  return Array.from({ length: count }, (_, index) => polyline.bulges?.[index] ?? 0);
}

export function polylineBulgeFromThreePoints(start: PlanPoint, through: PlanPoint, end: PlanPoint): number | null {
  const arc = arcFromThreePoints({ ...start, z: 0 }, { ...through, z: 0 }, { ...end, z: 0 });
  if (!arc) return null;
  const sweepRadians = arcSweepAngle(arc) * Math.PI / 180;
  const bulge = Math.tan(sweepRadians / 4) * (arc.counterclockwise ? 1 : -1);
  return Number.isFinite(bulge) ? bulge : null;
}

export function polylineSegmentPoints(segment: PlanSegment, subdivisions = 24): PlanPoint[] {
  const chordX = segment.end.x - segment.start.x;
  const chordY = segment.end.y - segment.start.y;
  const chord = Math.hypot(chordX, chordY);
  if (Math.abs(segment.bulge) < 1e-10 || chord < 1 / 16) return [clonePlanPoint(segment.start), clonePlanPoint(segment.end)];
  const centerOffset = chord * (1 - segment.bulge ** 2) / (4 * segment.bulge);
  const midpoint = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
  const center = { x: midpoint.x - chordY / chord * centerOffset, y: midpoint.y + chordX / chord * centerOffset };
  const startAngle = Math.atan2(segment.start.y - center.y, segment.start.x - center.x);
  const sweep = 4 * Math.atan(segment.bulge);
  const radius = Math.hypot(segment.start.x - center.x, segment.start.y - center.y);
  const count = Math.max(4, Math.ceil(Math.abs(sweep) / (Math.PI * 2) * subdivisions));
  const points = Array.from({ length: count + 1 }, (_, index) => {
    const angle = startAngle + sweep * index / count;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
  points[0] = clonePlanPoint(segment.start);
  points[points.length - 1] = clonePlanPoint(segment.end);
  return points;
}

export function polylineSegmentCircularGeometry(segment: PlanSegment): { center: PlanPoint; counterclockwise: boolean; endAngle: number; radius: number; startAngle: number } | null {
  const chordX = segment.end.x - segment.start.x;
  const chordY = segment.end.y - segment.start.y;
  const chord = Math.hypot(chordX, chordY);
  if (Math.abs(segment.bulge) < 1e-10 || chord < 1 / 16) return null;
  const centerOffset = chord * (1 - segment.bulge ** 2) / (4 * segment.bulge);
  const center = {
    x: (segment.start.x + segment.end.x) / 2 - chordY / chord * centerOffset,
    y: (segment.start.y + segment.end.y) / 2 + chordX / chord * centerOffset,
  };
  const startAngle = ((Math.atan2(segment.start.y - center.y, segment.start.x - center.x) * 180 / Math.PI) % 360 + 360) % 360;
  const sweep = 4 * Math.atan(segment.bulge) * 180 / Math.PI;
  return {
    center,
    counterclockwise: segment.bulge > 0,
    endAngle: ((startAngle + sweep) % 360 + 360) % 360,
    radius: Math.hypot(segment.start.x - center.x, segment.start.y - center.y),
    startAngle,
  };
}

export function polylinePathPoints(polyline: PolylineGeometry): PlanPoint[] {
  return polylineSegments(polyline).flatMap((segment, index) => polylineSegmentPoints(segment).slice(index ? 1 : 0));
}

export function polylineLength(polyline: PolylineGeometry): number {
  return polylineSegments(polyline).reduce((total, segment) => {
    const chord = Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
    if (Math.abs(segment.bulge) < 1e-10) return total + chord;
    const sweep = Math.abs(4 * Math.atan(segment.bulge));
    const radius = chord * (1 + segment.bulge ** 2) / (4 * Math.abs(segment.bulge));
    return total + radius * sweep;
  }, 0);
}

export function polylineArea(polyline: PolylineGeometry): number {
  if (!polyline.closed || polyline.vertices.length < 3) return 0;
  const signedArea = polylineSegments(polyline).reduce((total, segment) => {
    const chordArea = (segment.start.x * segment.end.y - segment.end.x * segment.start.y) / 2;
    if (Math.abs(segment.bulge) < 1e-10) return total + chordArea;
    const chord = Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
    const sweep = 4 * Math.atan(segment.bulge);
    const radius = chord * (1 + segment.bulge ** 2) / (4 * Math.abs(segment.bulge));
    return total + chordArea + radius ** 2 * (sweep - Math.sin(sweep)) / 2;
  }, 0);
  return Math.abs(signedArea);
}

export function polylineCentroid(polyline: PolylineGeometry): PlanPoint | null {
  if (!polyline.closed || polyline.vertices.length < 3) return null;
  const points = polylinePathPoints(polyline);
  if (points.length < 3) return null;
  const closedPoints = points[0].x === points.at(-1)?.x && points[0].y === points.at(-1)?.y ? points : [...points, points[0]];
  let crossTotal = 0;
  let xTotal = 0;
  let yTotal = 0;
  for (let index = 0; index < closedPoints.length - 1; index += 1) {
    const start = closedPoints[index];
    const end = closedPoints[index + 1];
    const cross = start.x * end.y - end.x * start.y;
    crossTotal += cross;
    xTotal += (start.x + end.x) * cross;
    yTotal += (start.y + end.y) * cross;
  }
  if (Math.abs(crossTotal) < 1e-10) return null;
  return snapPlanPoint({ x: xTotal / (3 * crossTotal), y: yTotal / (3 * crossTotal) });
}

export function polylineGeometryIsValid(polyline: PolylineGeometry): boolean {
  if (polyline.vertices.length < (polyline.closed ? 3 : 2) || polyline.vertices.length > MAXIMUM_POLYLINE_VERTICES) return false;
  if (!Number.isFinite(polyline.elevation) || Math.abs(polyline.elevation) > MAXIMUM_COORDINATE ||
      Math.abs(polyline.elevation * 16 - Math.round(polyline.elevation * 16)) > 1e-8) return false;
  if (!polyline.vertices.every(planPointIsValid)) return false;
  const width = polyline.width ?? 0;
  const bulges = normalizedPolylineBulges(polyline);
  if (!Number.isFinite(width) || width < 0 || width > MAXIMUM_COORDINATE || Math.abs(width * 16 - Math.round(width * 16)) > 1e-8) return false;
  if (polyline.bulges && polyline.bulges.length !== polylineSegmentCount(polyline)) return false;
  if (!bulges.every((bulge) => Number.isFinite(bulge) && Math.abs(bulge) <= 1_000_000)) return false;
  return polylineSegments(polyline).every((segment) =>
    Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y) >= 1 / 16);
}

function rectangleAxes(rotation = 0) {
  const angle = rotation * Math.PI / 180;
  return {
    x: { x: Math.cos(angle), y: Math.sin(angle) },
    y: { x: -Math.sin(angle), y: Math.cos(angle) },
  };
}

function canonicalPlanPoint(point: PlanPoint): PlanPoint {
  const snapped = snapPlanPoint(point);
  return { x: Object.is(snapped.x, -0) ? 0 : snapped.x, y: Object.is(snapped.y, -0) ? 0 : snapped.y };
}

function rectangleFromLocalDimensions(
  start: PlanPoint,
  localWidth: number,
  localHeight: number,
  elevation: number,
  options: RectangleConstructionOptions,
): PolylineGeometry | null {
  if (!Number.isFinite(localWidth) || !Number.isFinite(localHeight) || Math.abs(localWidth) < 1 / 16 || Math.abs(localHeight) < 1 / 16 ||
      !Number.isFinite(elevation) || Math.abs(elevation) > MAXIMUM_COORDINATE) return null;
  const lineWidth = snapToSixteenth(options.width ?? 0);
  const chamferX = snapToSixteenth(options.chamferX ?? 0);
  const chamferY = snapToSixteenth(options.chamferY ?? 0);
  const filletRadius = snapToSixteenth(options.filletRadius ?? 0);
  if (![lineWidth, chamferX, chamferY, filletRadius].every(Number.isFinite) || lineWidth < 0 || chamferX < 0 || chamferY < 0 || filletRadius < 0) return null;
  if (filletRadius > 0 && (chamferX > 0 || chamferY > 0)) return null;

  const origin = canonicalPlanPoint(start);
  const axes = rectangleAxes(options.rotation);
  const corners = [
    origin,
    canonicalPlanPoint({ x: origin.x + axes.x.x * localWidth, y: origin.y + axes.x.y * localWidth }),
    canonicalPlanPoint({ x: origin.x + axes.x.x * localWidth + axes.y.x * localHeight, y: origin.y + axes.x.y * localWidth + axes.y.y * localHeight }),
    canonicalPlanPoint({ x: origin.x + axes.y.x * localHeight, y: origin.y + axes.y.y * localHeight }),
  ];
  if (corners.some((point) => Math.abs(point.x) > MAXIMUM_COORDINATE || Math.abs(point.y) > MAXIMUM_COORDINATE)) return null;

  const width = Math.abs(localWidth);
  const height = Math.abs(localHeight);
  const cornerX = filletRadius || chamferX;
  const cornerY = filletRadius || chamferY;
  if (cornerX * 2 >= width || cornerY * 2 >= height) return null;
  if (cornerX < 1 / 16 && cornerY < 1 / 16) {
    const geometry = { bulges: [0, 0, 0, 0], closed: true, elevation: snapToSixteenth(elevation), vertices: corners, width: lineWidth };
    return polylineGeometryIsValid(geometry) ? geometry : null;
  }

  const orientation = Math.sign(localWidth * localHeight) || 1;
  const edgeUnits = corners.map((corner, index) => {
    const end = corners[(index + 1) % 4];
    const length = Math.hypot(end.x - corner.x, end.y - corner.y);
    return { x: (end.x - corner.x) / length, y: (end.y - corner.y) / length };
  });
  const outgoingDistances = [cornerX, cornerY, cornerX, cornerY];
  const incomingDistances = [cornerY, cornerX, cornerY, cornerX];
  const before = corners.map((corner, index) => {
    const incoming = edgeUnits[(index + 3) % 4];
    return canonicalPlanPoint({ x: corner.x - incoming.x * incomingDistances[index], y: corner.y - incoming.y * incomingDistances[index] });
  });
  const after = corners.map((corner, index) => {
    const outgoing = edgeUnits[index];
    return canonicalPlanPoint({ x: corner.x + outgoing.x * outgoingDistances[index], y: corner.y + outgoing.y * outgoingDistances[index] });
  });
  const vertices = [after[0], before[1], after[1], before[2], after[2], before[3], after[3], before[0]];
  const cornerBulge = filletRadius > 0 ? Math.tan(Math.PI / 8) * orientation : 0;
  const geometry = {
    bulges: [0, cornerBulge, 0, cornerBulge, 0, cornerBulge, 0, cornerBulge],
    closed: true,
    elevation: snapToSixteenth(elevation),
    vertices,
    width: lineWidth,
  };
  return polylineGeometryIsValid(geometry) ? geometry : null;
}

export function rectangleFromCorners(start: PlanPoint, end: PlanPoint, elevation = 0, options: RectangleConstructionOptions = {}): PolylineGeometry | null {
  const axes = rectangleAxes(options.rotation);
  const delta = { x: end.x - start.x, y: end.y - start.y };
  const localWidth = delta.x * axes.x.x + delta.y * axes.x.y;
  const localHeight = delta.x * axes.y.x + delta.y * axes.y.y;
  return rectangleFromLocalDimensions(start, localWidth, localHeight, elevation, options);
}

export function rectangleDimensions(start: PlanPoint, end: PlanPoint): RectangleDimensions {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { area: width * height, height, perimeter: 2 * (width + height), width };
}

export function rectangleFromDimensions(
  start: PlanPoint,
  direction: PlanPoint | null,
  width: number,
  height: number,
  elevation = 0,
  options: RectangleConstructionOptions = {},
): PolylineGeometry | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 / 16 || height < 1 / 16) return null;
  const axes = rectangleAxes(options.rotation);
  const delta = direction ? { x: direction.x - start.x, y: direction.y - start.y } : axes.x;
  const xSign = delta.x * axes.x.x + delta.y * axes.x.y < 0 ? -1 : 1;
  const ySign = delta.x * axes.y.x + delta.y * axes.y.y < 0 ? -1 : 1;
  return rectangleFromLocalDimensions(start, xSign * snapToSixteenth(width), ySign * snapToSixteenth(height), elevation, options);
}

export function rectangleFromArea(
  start: PlanPoint,
  direction: PlanPoint | null,
  area: number,
  fixedDimension: number,
  basis: RectangleAreaBasis,
  elevation = 0,
  options: RectangleConstructionOptions = {},
): PolylineGeometry | null {
  if (!Number.isFinite(area) || !Number.isFinite(fixedDimension) || area < 1 / 256 || fixedDimension < 1 / 16) return null;
  const otherDimension = snapToSixteenth(area / fixedDimension);
  if (otherDimension < 1 / 16) return null;
  return rectangleFromDimensions(
    start,
    direction,
    basis === "length" ? fixedDimension : otherDimension,
    basis === "width" ? fixedDimension : otherDimension,
    elevation,
    options,
  );
}

export function rectangleSupportsConstrainedGrips(rectangle: PolylineGeometry): boolean {
  if (rectangle.vertices.length !== 4 || normalizedPolylineBulges(rectangle).some((bulge) => Math.abs(bulge) > 1e-10)) return false;
  return rectangle.vertices.every((point, index) => {
    const end = rectangle.vertices[(index + 1) % 4];
    return Math.abs(point.x - end.x) < 1e-8 || Math.abs(point.y - end.y) < 1e-8;
  });
}

export function parseRectangleDimensionPair(input: string): { height: number; width: number } | null {
  const parts = input.trim().split(/\s*[x×]\s*/i);
  if (parts.length !== 2) return null;
  const width = parseArchitectural(parts[0]);
  const height = parseArchitectural(parts[1]);
  if (width === null || height === null || width < 1 / 16 || height < 1 / 16) return null;
  return { height: snapToSixteenth(height), width: snapToSixteenth(width) };
}

export function rectangleGripPoints(rectangle: PolylineGeometry): Array<{ grip: RectangleGrip; point: PlanPoint }> {
  if (!rectangleSupportsConstrainedGrips(rectangle)) return [];
  const corners = rectangle.vertices.map((point, index) => ({ grip: { index, kind: "corner" } as RectangleGrip, point: clonePlanPoint(point) }));
  const edges = rectangle.vertices.map((point, index) => {
    const end = rectangle.vertices[(index + 1) % 4];
    return { grip: { index, kind: "edge" } as RectangleGrip, point: { x: (point.x + end.x) / 2, y: (point.y + end.y) / 2 } };
  });
  const center = { x: (rectangle.vertices[0].x + rectangle.vertices[2].x) / 2, y: (rectangle.vertices[0].y + rectangle.vertices[2].y) / 2 };
  return [...corners, ...edges, { grip: { kind: "center" }, point: center }];
}

function remainsOnOriginalSide(value: number, opposite: number, original: number): boolean {
  return Math.abs(value - opposite) >= 1 / 16 && Math.sign(value - opposite) === Math.sign(original - opposite);
}

export function moveRectangleGrip(rectangle: PolylineGeometry, grip: RectangleGrip, target: PlanPoint): PolylineGeometry | null {
  if (rectangle.vertices.length !== 4) return null;
  const point = snapPlanPoint(target);
  if (grip.kind === "center") {
    const center = rectangleGripPoints(rectangle).at(-1)?.point;
    if (!center) return null;
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const next = { ...clonePolylineGeometry(rectangle), vertices: rectangle.vertices.map((vertex) => snapPlanPoint({ x: vertex.x + dx, y: vertex.y + dy })) };
    return polylineGeometryIsValid(next) ? next : null;
  }
  if (!Number.isInteger(grip.index) || grip.index < 0 || grip.index > 3) return null;
  const next = clonePolylineGeometry(rectangle);
  if (grip.kind === "corner") {
    const oppositeIndex = (grip.index + 2) % 4;
    const original = rectangle.vertices[grip.index];
    const opposite = rectangle.vertices[oppositeIndex];
    if (!remainsOnOriginalSide(point.x, opposite.x, original.x) || !remainsOnOriginalSide(point.y, opposite.y, original.y)) return null;
    if (grip.index === 0) {
      next.vertices = [point, { x: opposite.x, y: point.y }, opposite, { x: point.x, y: opposite.y }];
    } else if (grip.index === 1) {
      next.vertices = [{ x: opposite.x, y: point.y }, point, { x: point.x, y: opposite.y }, opposite];
    } else if (grip.index === 2) {
      next.vertices = [opposite, { x: point.x, y: opposite.y }, point, { x: opposite.x, y: point.y }];
    } else {
      next.vertices = [{ x: point.x, y: opposite.y }, opposite, { x: opposite.x, y: point.y }, point];
    }
  } else if (grip.index === 0 || grip.index === 2) {
    const oppositeIndex = (grip.index + 2) % 4;
    const originalY = rectangle.vertices[grip.index].y;
    const oppositeY = rectangle.vertices[oppositeIndex].y;
    if (!remainsOnOriginalSide(point.y, oppositeY, originalY)) return null;
    next.vertices[grip.index].y = point.y;
    next.vertices[(grip.index + 1) % 4].y = point.y;
  } else {
    const oppositeIndex = (grip.index + 2) % 4;
    const originalX = rectangle.vertices[grip.index].x;
    const oppositeX = rectangle.vertices[oppositeIndex].x;
    if (!remainsOnOriginalSide(point.x, oppositeX, originalX)) return null;
    next.vertices[grip.index].x = point.x;
    next.vertices[(grip.index + 1) % 4].x = point.x;
  }
  return polylineGeometryIsValid(next) ? next : null;
}

export function updatePolylineVertex(polyline: PolylineGeometry, index: number, point: PlanPoint): PolylineGeometry | null {
  if (!Number.isInteger(index) || index < 0 || index >= polyline.vertices.length) return null;
  const next = clonePolylineGeometry(polyline);
  next.vertices[index] = snapPlanPoint(point);
  return polylineGeometryIsValid(next) ? next : null;
}

export function polylineGeometriesEqual(a: PolylineGeometry, b: PolylineGeometry): boolean {
  const aBulges = normalizedPolylineBulges(a);
  const bBulges = normalizedPolylineBulges(b);
  return a.closed === b.closed && a.elevation === b.elevation && (a.width ?? 0) === (b.width ?? 0) &&
    a.vertices.length === b.vertices.length && aBulges.length === bBulges.length &&
    aBulges.every((bulge, index) => bulge === bBulges[index]) &&
    a.vertices.every((point, index) => point.x === b.vertices[index].x && point.y === b.vertices[index].y);
}
