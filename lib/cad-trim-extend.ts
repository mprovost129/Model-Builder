import {
  arcGeometryIsValid,
  arcPointAtFraction,
  arcSweepAngle,
  normalizeArcAngle,
  type ArcGeometry,
} from "./cad-arc.ts";
import {
  circularIntersections,
  nearestPointOnSegment,
  segmentCircularIntersections,
  type CircularSnapGeometry,
} from "./cad-point-acquisition.ts";
import {
  lineGeometryIsValid,
  snapLinePoint,
  snapPlanPoint,
  type LineGeometry,
  type LinePoint,
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

export type TrimExtendBoundary =
  | { geometry: LineGeometry; kind: "line" }
  | { geometry: CircularSnapGeometry; kind: "circular" };

const GEOMETRY_EPSILON = 1e-7;

function samePlanPoint(a: PlanPoint, b: PlanPoint): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 1 / 32;
}

function uniquePoints(points: LinePoint[]): LinePoint[] {
  return points.filter((point, index, all) => all.findIndex((candidate) =>
    Math.hypot(candidate.x - point.x, candidate.y - point.y, candidate.z - point.z) < 1 / 32) === index);
}

function normalizeRadians(value: number): number {
  const fullTurn = Math.PI * 2;
  return ((value % fullTurn) + fullTurn) % fullTurn;
}

function counterclockwiseRadians(start: number, end: number): number {
  return normalizeRadians(end - start);
}

function circularPointIncluded(curve: CircularSnapGeometry, point: LinePoint): boolean {
  if (curve.startAngle === undefined || curve.endAngle === undefined || curve.counterclockwise === undefined) return true;
  const angle = normalizeArcAngle(Math.atan2(point.y - curve.center.y, point.x - curve.center.x) * 180 / Math.PI);
  const candidate: ArcGeometry = {
    center: curve.center,
    counterclockwise: curve.counterclockwise,
    endAngle: curve.endAngle,
    radius: curve.radius,
    startAngle: curve.startAngle,
  };
  const startRadians = candidate.startAngle * Math.PI / 180;
  const pointRadians = angle * Math.PI / 180;
  const distance = candidate.counterclockwise
    ? counterclockwiseRadians(startRadians, pointRadians)
    : counterclockwiseRadians(pointRadians, startRadians);
  return distance <= arcSweepAngle(candidate) * Math.PI / 180 + GEOMETRY_EPSILON;
}

function lineBoundaryIntersections(target: LineGeometry, boundary: TrimExtendBoundary): Array<{ point: LinePoint; parameter: number }> {
  const dx = target.end.x - target.start.x;
  const dy = target.end.y - target.start.y;
  const dz = target.end.z - target.start.z;
  const planLengthSquared = dx * dx + dy * dy;
  if (planLengthSquared < GEOMETRY_EPSILON) return [];
  if (boundary.kind === "line") {
    const bx = boundary.geometry.end.x - boundary.geometry.start.x;
    const by = boundary.geometry.end.y - boundary.geometry.start.y;
    const denominator = dx * by - dy * bx;
    if (Math.abs(denominator) < GEOMETRY_EPSILON) return [];
    const offsetX = boundary.geometry.start.x - target.start.x;
    const offsetY = boundary.geometry.start.y - target.start.y;
    const targetParameter = (offsetX * by - offsetY * bx) / denominator;
    const boundaryParameter = (offsetX * dy - offsetY * dx) / denominator;
    if (boundaryParameter < -GEOMETRY_EPSILON || boundaryParameter > 1 + GEOMETRY_EPSILON) return [];
    const targetZ = target.start.z + dz * targetParameter;
    const boundaryZ = boundary.geometry.start.z + (boundary.geometry.end.z - boundary.geometry.start.z) * boundaryParameter;
    if (Math.abs(targetZ - boundaryZ) > 1 / 16) return [];
    return [{
      parameter: targetParameter,
      point: snapLinePoint({
        x: target.start.x + dx * targetParameter,
        y: target.start.y + dy * targetParameter,
        z: (targetZ + boundaryZ) / 2,
      }),
    }];
  }

  const fx = target.start.x - boundary.geometry.center.x;
  const fy = target.start.y - boundary.geometry.center.y;
  const a = planLengthSquared;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - boundary.geometry.radius ** 2;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < -GEOMETRY_EPSILON) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  const parameters = root < GEOMETRY_EPSILON ? [-b / (2 * a)] : [(-b - root) / (2 * a), (-b + root) / (2 * a)];
  return parameters.flatMap((parameter) => {
    const point = snapLinePoint({
      x: target.start.x + dx * parameter,
      y: target.start.y + dy * parameter,
      z: target.start.z + dz * parameter,
    });
    return Math.abs(point.z - boundary.geometry.center.z) <= 1 / 16 && circularPointIncluded(boundary.geometry, point)
      ? [{ parameter, point }]
      : [];
  });
}

function circularBoundaryIntersections(target: CircularSnapGeometry, boundaries: TrimExtendBoundary[]): LinePoint[] {
  return uniquePoints(boundaries.flatMap((boundary) => boundary.kind === "line"
    ? segmentCircularIntersections(boundary.geometry, target)
    : circularIntersections(target, boundary.geometry)));
}

function lineParameter(line: LineGeometry, point: LinePoint): number {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const denominator = dx * dx + dy * dy;
  return denominator < GEOMETRY_EPSILON ? 0 : ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / denominator;
}

export function trimLineGeometry(line: LineGeometry, boundaries: TrimExtendBoundary[], pick: LinePoint): LineGeometry[] | null {
  const cuts = boundaries.flatMap((boundary) => lineBoundaryIntersections(line, boundary))
    .filter(({ parameter }) => parameter > GEOMETRY_EPSILON && parameter < 1 - GEOMETRY_EPSILON)
    .sort((a, b) => a.parameter - b.parameter)
    .filter(({ parameter }, index, all) => index === 0 || Math.abs(parameter - all[index - 1].parameter) > GEOMETRY_EPSILON);
  if (!cuts.length) return null;
  const pickParameter = Math.max(0, Math.min(1, lineParameter(line, pick)));
  const lower = [...cuts].reverse().find(({ parameter }) => parameter < pickParameter)?.parameter ?? 0;
  const upper = cuts.find(({ parameter }) => parameter > pickParameter)?.parameter ?? 1;
  if (upper - lower < GEOMETRY_EPSILON) return null;
  const pointAt = (parameter: number) => snapLinePoint({
    x: line.start.x + (line.end.x - line.start.x) * parameter,
    y: line.start.y + (line.end.y - line.start.y) * parameter,
    z: line.start.z + (line.end.z - line.start.z) * parameter,
  });
  const pieces = [
    lower > GEOMETRY_EPSILON ? { start: line.start, end: pointAt(lower) } : null,
    upper < 1 - GEOMETRY_EPSILON ? { start: pointAt(upper), end: line.end } : null,
  ].filter((piece): piece is LineGeometry => Boolean(piece) && lineGeometryIsValid(piece!));
  return pieces;
}

export function extendLineGeometry(line: LineGeometry, boundaries: TrimExtendBoundary[], pick: LinePoint): LineGeometry | null {
  const pickParameter = lineParameter(line, pick);
  const extendStart = pickParameter <= 0.5;
  const intersections = boundaries.flatMap((boundary) => lineBoundaryIntersections(line, boundary))
    .filter(({ parameter }) => extendStart ? parameter < -GEOMETRY_EPSILON : parameter > 1 + GEOMETRY_EPSILON)
    .sort((a, b) => extendStart ? b.parameter - a.parameter : a.parameter - b.parameter);
  const point = intersections[0]?.point;
  if (!point) return null;
  const result = extendStart ? { start: point, end: line.end } : { start: line.start, end: point };
  return lineGeometryIsValid(result) ? result : null;
}

function arcFractionAtPoint(arc: ArcGeometry, point: LinePoint): number {
  const start = arc.startAngle * Math.PI / 180;
  const angle = Math.atan2(point.y - arc.center.y, point.x - arc.center.x);
  const distance = arc.counterclockwise ? counterclockwiseRadians(start, angle) : counterclockwiseRadians(angle, start);
  return Math.max(0, Math.min(1, distance / (arcSweepAngle(arc) * Math.PI / 180)));
}

function arcSlice(arc: ArcGeometry, startFraction: number, endFraction: number): ArcGeometry | null {
  if (endFraction - startFraction < GEOMETRY_EPSILON) return null;
  const start = arcPointAtFraction(arc, startFraction);
  const end = arcPointAtFraction(arc, endFraction);
  const result = {
    ...arc,
    center: { ...arc.center },
    startAngle: normalizeArcAngle(Math.atan2(start.y - arc.center.y, start.x - arc.center.x) * 180 / Math.PI),
    endAngle: normalizeArcAngle(Math.atan2(end.y - arc.center.y, end.x - arc.center.x) * 180 / Math.PI),
  };
  return arcGeometryIsValid(result) ? result : null;
}

export function trimArcGeometry(arc: ArcGeometry, boundaries: TrimExtendBoundary[], pick: LinePoint): ArcGeometry[] | null {
  const target: CircularSnapGeometry = { ...arc };
  const cuts = circularBoundaryIntersections(target, boundaries)
    .map((point) => arcFractionAtPoint(arc, point))
    .filter((fraction) => fraction > GEOMETRY_EPSILON && fraction < 1 - GEOMETRY_EPSILON)
    .sort((a, b) => a - b)
    .filter((fraction, index, all) => index === 0 || Math.abs(fraction - all[index - 1]) > GEOMETRY_EPSILON);
  if (!cuts.length) return null;
  const pickFraction = arcFractionAtPoint(arc, pick);
  const lower = [...cuts].reverse().find((fraction) => fraction < pickFraction) ?? 0;
  const upper = cuts.find((fraction) => fraction > pickFraction) ?? 1;
  const pieces = [arcSlice(arc, 0, lower), arcSlice(arc, upper, 1)].filter((piece): piece is ArcGeometry => piece !== null);
  return pieces;
}

export function trimCircleGeometry(circle: CircularSnapGeometry, boundaries: TrimExtendBoundary[], pick: LinePoint): ArcGeometry | null {
  const intersections = circularBoundaryIntersections(circle, boundaries);
  const angles = intersections.map((point) => normalizeRadians(Math.atan2(point.y - circle.center.y, point.x - circle.center.x)))
    .sort((a, b) => a - b)
    .filter((angle, index, all) => index === 0 || Math.abs(angle - all[index - 1]) > GEOMETRY_EPSILON);
  if (angles.length < 2) return null;
  const pickAngle = normalizeRadians(Math.atan2(pick.y - circle.center.y, pick.x - circle.center.x));
  const intervalIndex = angles.findIndex((angle, index) => {
    const next = angles[(index + 1) % angles.length] + (index === angles.length - 1 ? Math.PI * 2 : 0);
    const candidate = pickAngle + (pickAngle < angle ? Math.PI * 2 : 0);
    return candidate > angle + GEOMETRY_EPSILON && candidate < next - GEOMETRY_EPSILON;
  });
  if (intervalIndex < 0) return null;
  const removedStart = angles[intervalIndex];
  const removedEnd = angles[(intervalIndex + 1) % angles.length];
  const result: ArcGeometry = {
    center: { ...circle.center },
    counterclockwise: true,
    endAngle: normalizeArcAngle(removedStart * 180 / Math.PI),
    radius: circle.radius,
    startAngle: normalizeArcAngle(removedEnd * 180 / Math.PI),
  };
  return arcGeometryIsValid(result) ? result : null;
}

export function extendArcGeometry(arc: ArcGeometry, boundaries: TrimExtendBoundary[], pick: LinePoint): ArcGeometry | null {
  const startPoint = arcPointAtFraction(arc, 0);
  const endPoint = arcPointAtFraction(arc, 1);
  const extendStart = Math.hypot(pick.x - startPoint.x, pick.y - startPoint.y) <= Math.hypot(pick.x - endPoint.x, pick.y - endPoint.y);
  const fullCircle: CircularSnapGeometry = { center: arc.center, radius: arc.radius };
  const candidates = circularBoundaryIntersections(fullCircle, boundaries).flatMap((point) => {
    if (circularPointIncluded({ ...arc }, point)) return [];
    const angle = normalizeArcAngle(Math.atan2(point.y - arc.center.y, point.x - arc.center.x) * 180 / Math.PI);
    const extension = extendStart
      ? arc.counterclockwise
        ? normalizeArcAngle(arc.startAngle - angle)
        : normalizeArcAngle(angle - arc.startAngle)
      : arc.counterclockwise
        ? normalizeArcAngle(angle - arc.endAngle)
        : normalizeArcAngle(arc.endAngle - angle);
    return extension > GEOMETRY_EPSILON && extension + arcSweepAngle(arc) < 360 - GEOMETRY_EPSILON
      ? [{ angle, extension }]
      : [];
  }).sort((a, b) => a.extension - b.extension);
  if (!candidates.length) return null;
  const result = {
    ...arc,
    center: { ...arc.center },
    endAngle: extendStart ? arc.endAngle : candidates[0].angle,
    startAngle: extendStart ? candidates[0].angle : arc.startAngle,
  };
  return arcGeometryIsValid(result) ? result : null;
}

function planSegmentToArc(segment: PlanSegment, elevation: number): ArcGeometry | null {
  const circular = polylineSegmentCircularGeometry(segment);
  return circular ? {
    center: { ...circular.center, z: elevation },
    counterclockwise: circular.counterclockwise,
    endAngle: circular.endAngle,
    radius: circular.radius,
    startAngle: circular.startAngle,
  } : null;
}

function arcToPlanSegment(arc: ArcGeometry): PlanSegment {
  const start = arcPointAtFraction(arc, 0);
  const end = arcPointAtFraction(arc, 1);
  const signedSweep = arcSweepAngle(arc) * Math.PI / 180 * (arc.counterclockwise ? 1 : -1);
  return {
    bulge: Math.tan(signedSweep / 4),
    end: snapPlanPoint(end),
    start: snapPlanPoint(start),
  };
}

function nearestPolylineSegmentIndex(polyline: PolylineGeometry, pick: LinePoint): number {
  let selected = 0;
  let minimum = Number.POSITIVE_INFINITY;
  polylineSegments(polyline).forEach((segment, segmentIndex) => {
    const points = polylineSegmentPoints(segment, 96);
    for (let index = 1; index < points.length; index += 1) {
      const nearest = nearestPointOnSegment(pick, {
        start: { ...points[index - 1], z: polyline.elevation },
        end: { ...points[index], z: polyline.elevation },
      });
      const distance = Math.hypot(pick.x - nearest.x, pick.y - nearest.y);
      if (distance < minimum) {
        minimum = distance;
        selected = segmentIndex;
      }
    }
  });
  return selected;
}

function polylineChains(segments: PlanSegment[], wasClosed: boolean, elevation: number, width: number): PolylineGeometry[] {
  if (!segments.length) return [];
  let ordered = [...segments];
  if (wasClosed) {
    const breakIndex = ordered.findIndex((segment, index) => !samePlanPoint(segment.end, ordered[(index + 1) % ordered.length].start));
    if (breakIndex < 0) return [];
    ordered = [...ordered.slice(breakIndex + 1), ...ordered.slice(0, breakIndex + 1)];
  }
  const chains: PlanSegment[][] = [];
  ordered.forEach((segment) => {
    const current = chains.at(-1);
    if (!current || !samePlanPoint(current.at(-1)!.end, segment.start)) chains.push([segment]);
    else current.push(segment);
  });
  return chains.flatMap((chain) => {
    const geometry: PolylineGeometry = {
      bulges: chain.map((segment) => segment.bulge),
      closed: false,
      elevation,
      vertices: [snapPlanPoint(chain[0].start), ...chain.map((segment) => snapPlanPoint(segment.end))],
      width,
    };
    return polylineGeometryIsValid(geometry) ? [geometry] : [];
  });
}

export function trimPolylineGeometry(polyline: PolylineGeometry, boundaries: TrimExtendBoundary[], pick: LinePoint): PolylineGeometry[] | null {
  const segments = polylineSegments(polyline);
  if (!segments.length) return null;
  const index = nearestPolylineSegmentIndex(polyline, pick);
  const target = segments[index];
  const arc = planSegmentToArc(target, polyline.elevation);
  const pieces = arc
    ? trimArcGeometry(arc, boundaries, pick)?.map(arcToPlanSegment)
    : trimLineGeometry({ start: { ...target.start, z: polyline.elevation }, end: { ...target.end, z: polyline.elevation } }, boundaries, pick)?.map((line) => ({ bulge: 0, start: snapPlanPoint(line.start), end: snapPlanPoint(line.end) }));
  if (!pieces) return null;
  const replaced = [...segments.slice(0, index), ...pieces, ...segments.slice(index + 1)];
  return polylineChains(replaced, polyline.closed, polyline.elevation, polyline.width ?? 0);
}

export function extendPolylineGeometry(polyline: PolylineGeometry, boundaries: TrimExtendBoundary[], pick: LinePoint): PolylineGeometry | null {
  if (polyline.closed) return null;
  const segments = polylineSegments(polyline);
  if (!segments.length) return null;
  const startDistance = Math.hypot(pick.x - segments[0].start.x, pick.y - segments[0].start.y);
  const endDistance = Math.hypot(pick.x - segments.at(-1)!.end.x, pick.y - segments.at(-1)!.end.y);
  const extendStart = startDistance <= endDistance;
  const index = extendStart ? 0 : segments.length - 1;
  const target = segments[index];
  const arc = planSegmentToArc(target, polyline.elevation);
  const extended = arc
    ? extendArcGeometry(arc, boundaries, pick)
    : extendLineGeometry({ start: { ...target.start, z: polyline.elevation }, end: { ...target.end, z: polyline.elevation } }, boundaries, pick);
  if (!extended) return null;
  const replacement = arc
    ? arcToPlanSegment(extended as ArcGeometry)
    : { bulge: 0, start: snapPlanPoint((extended as LineGeometry).start), end: snapPlanPoint((extended as LineGeometry).end) };
  const nextSegments = segments.map((segment, segmentIndex) => segmentIndex === index ? replacement : segment);
  const result: PolylineGeometry = {
    bulges: nextSegments.map((segment) => segment.bulge),
    closed: false,
    elevation: polyline.elevation,
    vertices: [snapPlanPoint(nextSegments[0].start), ...nextSegments.map((segment) => snapPlanPoint(segment.end))],
    width: polyline.width ?? 0,
  };
  return polylineGeometryIsValid(result) ? result : null;
}

