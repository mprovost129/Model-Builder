import {
  MINIMUM_LINE_LENGTH,
  snapLineDirection,
  snapLinePoint,
  type LineGeometry,
  type LinePoint,
} from "./cad-line.ts";

export type ObjectSnapMode = "endpoint" | "midpoint" | "center" | "geometric-center" | "quadrant" | "intersection" | "tangent" | "perpendicular" | "extension" | "parallel" | "nearest" | "node" | "corner";
export type CadSnapKind = ObjectSnapMode | "grid" | "ortho" | "polar" | "tracking";

export type CircularSnapGeometry = {
  center: LinePoint;
  counterclockwise?: boolean;
  endAngle?: number;
  radius: number;
  startAngle?: number;
};

export type CadSnapCandidate = {
  kind: ObjectSnapMode;
  point: LinePoint;
};

export type CadTrackingCandidate = {
  angle: number;
  origin: LinePoint;
  point: LinePoint;
};

export type CadPointAcquisition = {
  candidateCount: number;
  guideAngle: number | null;
  guideOrigin: LinePoint | null;
  point: LinePoint;
  snapKind: CadSnapKind;
};

export const DEFAULT_OBJECT_SNAP_MODES: ObjectSnapMode[] = ["endpoint", "midpoint", "center", "geometric-center", "quadrant", "intersection", "perpendicular", "extension", "corner"];

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function counterclockwiseAngleDistance(start: number, end: number): number {
  return normalizeAngle(end - start);
}

function canonicalLinePoint(point: LinePoint): LinePoint {
  const snapped = snapLinePoint(point);
  return {
    x: Object.is(snapped.x, -0) ? 0 : snapped.x,
    y: Object.is(snapped.y, -0) ? 0 : snapped.y,
    z: Object.is(snapped.z, -0) ? 0 : snapped.z,
  };
}

function validGridIncrement(increment: number): number {
  return Number.isFinite(increment) && increment >= 1 / 16 ? increment : 1 / 16;
}

export function snapPointToGridIncrement(point: LinePoint, increment: number): LinePoint {
  const spacing = validGridIncrement(increment);
  return canonicalLinePoint({
    x: Math.round(point.x / spacing) * spacing,
    y: Math.round(point.y / spacing) * spacing,
    z: point.z,
  });
}

function snapPointAlongAngle(anchor: LinePoint, pointer: LinePoint, angle: number, increment: number): LinePoint {
  const radians = angle * Math.PI / 180;
  const directionX = Math.cos(radians);
  const directionY = Math.sin(radians);
  const projectedDistance = (pointer.x - anchor.x) * directionX + (pointer.y - anchor.y) * directionY;
  const spacing = validGridIncrement(increment);
  const distance = Math.round(projectedDistance / spacing) * spacing;
  return canonicalLinePoint({
    x: anchor.x + directionX * distance,
    y: anchor.y + directionY * distance,
    z: pointer.z,
  });
}

function circularPointIsIncluded(curve: CircularSnapGeometry, point: LinePoint): boolean {
  if (curve.startAngle === undefined || curve.endAngle === undefined || curve.counterclockwise === undefined) return true;
  const angle = normalizeAngle(Math.atan2(point.y - curve.center.y, point.x - curve.center.x) * 180 / Math.PI);
  const sweep = curve.counterclockwise
    ? counterclockwiseAngleDistance(curve.startAngle, curve.endAngle)
    : counterclockwiseAngleDistance(curve.endAngle, curve.startAngle);
  const pointSweep = curve.counterclockwise
    ? counterclockwiseAngleDistance(curve.startAngle, angle)
    : counterclockwiseAngleDistance(angle, curve.startAngle);
  return pointSweep <= sweep + 1e-7;
}

function circularPoint(curve: CircularSnapGeometry, angle: number): LinePoint {
  const radians = angle * Math.PI / 180;
  return canonicalLinePoint({
    x: curve.center.x + Math.cos(radians) * curve.radius,
    y: curve.center.y + Math.sin(radians) * curve.radius,
    z: curve.center.z,
  });
}

function circularEndpoints(curve: CircularSnapGeometry): LinePoint[] {
  return curve.startAngle === undefined || curve.endAngle === undefined
    ? []
    : [circularPoint(curve, curve.startAngle), circularPoint(curve, curve.endAngle)];
}

export function circularQuadrantPoints(curve: CircularSnapGeometry): LinePoint[] {
  return [0, 90, 180, 270]
    .map((angle) => circularPoint(curve, angle))
    .filter((point) => circularPointIsIncluded(curve, point));
}

export function nearestPointOnCircularCurve(point: LinePoint, curve: CircularSnapGeometry): LinePoint {
  const dx = point.x - curve.center.x;
  const dy = point.y - curve.center.y;
  const distance = Math.hypot(dx, dy);
  const radial = distance < 1e-10
    ? circularPoint(curve, curve.startAngle ?? 0)
    : canonicalLinePoint({ x: curve.center.x + dx / distance * curve.radius, y: curve.center.y + dy / distance * curve.radius, z: curve.center.z });
  if (circularPointIsIncluded(curve, radial)) return radial;
  return circularEndpoints(curve).reduce((nearest, endpoint) =>
    Math.hypot(endpoint.x - point.x, endpoint.y - point.y) < Math.hypot(nearest.x - point.x, nearest.y - point.y) ? endpoint : nearest);
}

export function tangentPointsFromAnchor(anchor: LinePoint, curve: CircularSnapGeometry): LinePoint[] {
  if (Math.abs(anchor.z - curve.center.z) > 1 / 16) return [];
  const dx = anchor.x - curve.center.x;
  const dy = anchor.y - curve.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= curve.radius + 1e-10) return [];
  const baseAngle = Math.atan2(dy, dx);
  const offset = Math.acos(curve.radius / distance);
  return [baseAngle + offset, baseAngle - offset]
    .map((angle) => canonicalLinePoint({ x: curve.center.x + Math.cos(angle) * curve.radius, y: curve.center.y + Math.sin(angle) * curve.radius, z: curve.center.z }))
    .filter((point) => circularPointIsIncluded(curve, point));
}

export function perpendicularPointsOnCircularCurve(anchor: LinePoint, curve: CircularSnapGeometry): LinePoint[] {
  if (Math.abs(anchor.z - curve.center.z) > 1 / 16) return [];
  const dx = anchor.x - curve.center.x;
  const dy = anchor.y - curve.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-10) return [];
  return [1, -1]
    .map((sign) => canonicalLinePoint({ x: curve.center.x + dx / distance * curve.radius * sign, y: curve.center.y + dy / distance * curve.radius * sign, z: curve.center.z }))
    .filter((point) => circularPointIsIncluded(curve, point));
}

export function extensionPointOnSegment(pointer: LinePoint, segment: LineGeometry): LinePoint | null {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < MINIMUM_LINE_LENGTH * MINIMUM_LINE_LENGTH) return null;
  const t = ((pointer.x - segment.start.x) * dx + (pointer.y - segment.start.y) * dy) / lengthSquared;
  if (t >= 0 && t <= 1) return null;
  return snapLinePoint({ x: segment.start.x + dx * t, y: segment.start.y + dy * t, z: segment.start.z + (segment.end.z - segment.start.z) * t });
}

export function parallelPointFromAnchor(anchor: LinePoint, pointer: LinePoint, segment: LineGeometry): LinePoint | null {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy);
  if (length < MINIMUM_LINE_LENGTH) return null;
  const projection = (pointer.x - anchor.x) * dx / length + (pointer.y - anchor.y) * dy / length;
  if (Math.abs(projection) < MINIMUM_LINE_LENGTH) return null;
  return snapLinePoint({ x: anchor.x + dx / length * projection, y: anchor.y + dy / length * projection, z: anchor.z });
}

export function nearestPointOnSegment(point: LinePoint, segment: LineGeometry): LinePoint {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  if (lengthSquared < MINIMUM_LINE_LENGTH * MINIMUM_LINE_LENGTH) return snapLinePoint(segment.start);
  const t = Math.max(0, Math.min(1, (
    (point.x - segment.start.x) * dx +
    (point.y - segment.start.y) * dy +
    (point.z - segment.start.z) * dz
  ) / lengthSquared));
  return snapLinePoint({
    x: segment.start.x + dx * t,
    y: segment.start.y + dy * t,
    z: segment.start.z + dz * t,
  });
}

export function perpendicularPointOnSegment(anchor: LinePoint, segment: LineGeometry): LinePoint | null {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  if (lengthSquared < MINIMUM_LINE_LENGTH * MINIMUM_LINE_LENGTH) return null;
  const t = (
    (anchor.x - segment.start.x) * dx +
    (anchor.y - segment.start.y) * dy +
    (anchor.z - segment.start.z) * dz
  ) / lengthSquared;
  if (t < 0 || t > 1) return null;
  return snapLinePoint({
    x: segment.start.x + dx * t,
    y: segment.start.y + dy * t,
    z: segment.start.z + dz * t,
  });
}

export function segmentIntersection(a: LineGeometry, b: LineGeometry): LinePoint | null {
  const adx = a.end.x - a.start.x;
  const ady = a.end.y - a.start.y;
  const bdx = b.end.x - b.start.x;
  const bdy = b.end.y - b.start.y;
  const denominator = adx * bdy - ady * bdx;
  if (Math.abs(denominator) < 1e-10) return null;
  const offsetX = b.start.x - a.start.x;
  const offsetY = b.start.y - a.start.y;
  const ta = (offsetX * bdy - offsetY * bdx) / denominator;
  const tb = (offsetX * ady - offsetY * adx) / denominator;
  if (ta < 0 || ta > 1 || tb < 0 || tb > 1) return null;
  const az = a.start.z + (a.end.z - a.start.z) * ta;
  const bz = b.start.z + (b.end.z - b.start.z) * tb;
  if (Math.abs(az - bz) > 1 / 16) return null;
  return snapLinePoint({
    x: a.start.x + adx * ta,
    y: a.start.y + ady * ta,
    z: (az + bz) / 2,
  });
}

export function segmentCircularIntersections(segment: LineGeometry, curve: CircularSnapGeometry): LinePoint[] {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const fx = segment.start.x - curve.center.x;
  const fy = segment.start.y - curve.center.y;
  const a = dx * dx + dy * dy;
  if (a < MINIMUM_LINE_LENGTH * MINIMUM_LINE_LENGTH) return [];
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - curve.radius * curve.radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < -1e-8) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  const parameters = discriminant <= 1e-8 ? [-b / (2 * a)] : [(-b - root) / (2 * a), (-b + root) / (2 * a)];
  return parameters
    .filter((t) => t >= 0 && t <= 1)
    .map((t) => ({
      point: canonicalLinePoint({ x: segment.start.x + dx * t, y: segment.start.y + dy * t, z: curve.center.z }),
      segmentZ: segment.start.z + (segment.end.z - segment.start.z) * t,
    }))
    .filter(({ point, segmentZ }) => Math.abs(segmentZ - curve.center.z) <= 1 / 16 && circularPointIsIncluded(curve, point))
    .map(({ point }) => point);
}

export function circularIntersections(a: CircularSnapGeometry, b: CircularSnapGeometry): LinePoint[] {
  if (Math.abs(a.center.z - b.center.z) > 1 / 16) return [];
  const dx = b.center.x - a.center.x;
  const dy = b.center.y - a.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-10 || distance > a.radius + b.radius + 1e-8 || distance < Math.abs(a.radius - b.radius) - 1e-8) return [];
  const along = (a.radius ** 2 - b.radius ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, a.radius ** 2 - along ** 2));
  const baseX = a.center.x + dx / distance * along;
  const baseY = a.center.y + dy / distance * along;
  const points = height < 1e-8
    ? [canonicalLinePoint({ x: baseX, y: baseY, z: (a.center.z + b.center.z) / 2 })]
    : [
      canonicalLinePoint({ x: baseX - dy / distance * height, y: baseY + dx / distance * height, z: (a.center.z + b.center.z) / 2 }),
      canonicalLinePoint({ x: baseX + dy / distance * height, y: baseY - dx / distance * height, z: (a.center.z + b.center.z) / 2 }),
    ];
  return points.filter((point) => circularPointIsIncluded(a, point) && circularPointIsIncluded(b, point));
}

export function derivedSnapCandidates({
  anchor,
  circulars = [],
  modes,
  pointer,
  segments,
}: {
  anchor: LinePoint | null;
  circulars?: CircularSnapGeometry[];
  modes: ObjectSnapMode[];
  pointer: LinePoint;
  segments: LineGeometry[];
}): CadSnapCandidate[] {
  const candidates: CadSnapCandidate[] = [];
  if (modes.includes("intersection")) {
    for (let a = 0; a < segments.length; a += 1) {
      for (let b = a + 1; b < segments.length; b += 1) {
        const point = segmentIntersection(segments[a], segments[b]);
        if (point) candidates.push({ kind: "intersection", point });
      }
    }
    segments.forEach((segment) => circulars.forEach((curve) => {
      candidates.push(...segmentCircularIntersections(segment, curve).map((point) => ({ kind: "intersection" as const, point })));
    }));
    for (let a = 0; a < circulars.length; a += 1) {
      for (let b = a + 1; b < circulars.length; b += 1) {
        candidates.push(...circularIntersections(circulars[a], circulars[b]).map((point) => ({ kind: "intersection" as const, point })));
      }
    }
  }
  segments.forEach((segment) => {
    if (modes.includes("nearest")) candidates.push({ kind: "nearest", point: nearestPointOnSegment(pointer, segment) });
    if (anchor && modes.includes("perpendicular")) {
      const point = perpendicularPointOnSegment(anchor, segment);
      if (point) candidates.push({ kind: "perpendicular", point });
    }
    if (modes.includes("extension")) {
      const point = extensionPointOnSegment(pointer, segment);
      if (point) candidates.push({ kind: "extension", point });
    }
    if (anchor && modes.includes("parallel")) {
      const point = parallelPointFromAnchor(anchor, pointer, segment);
      if (point) candidates.push({ kind: "parallel", point });
    }
  });
  circulars.forEach((curve) => {
    if (modes.includes("nearest")) candidates.push({ kind: "nearest", point: nearestPointOnCircularCurve(pointer, curve) });
    if (anchor && modes.includes("tangent")) candidates.push(...tangentPointsFromAnchor(anchor, curve).map((point) => ({ kind: "tangent" as const, point })));
    if (anchor && modes.includes("perpendicular")) candidates.push(...perpendicularPointsOnCircularCurve(anchor, curve).map((point) => ({ kind: "perpendicular" as const, point })));
  });
  return candidates;
}

export function trackingCandidatesFromAcquiredPoints({
  acquiredPoints,
  angles,
  captureDistance = 4,
  gridIncrement = 1 / 16,
  pointer,
}: {
  acquiredPoints: LinePoint[];
  angles: number[];
  captureDistance?: number;
  gridIncrement?: number;
  pointer: LinePoint;
}): CadTrackingCandidate[] {
  const candidates: Array<CadTrackingCandidate & { distance: number }> = [];
  acquiredPoints.forEach((origin) => {
    angles.forEach((angle) => {
      const radians = normalizeAngle(angle) * Math.PI / 180;
      const directionX = Math.cos(radians);
      const directionY = Math.sin(radians);
      const offsetX = pointer.x - origin.x;
      const offsetY = pointer.y - origin.y;
      const projection = offsetX * directionX + offsetY * directionY;
      const projectedPoint = canonicalLinePoint({
        x: origin.x + directionX * projection,
        y: origin.y + directionY * projection,
        z: pointer.z,
      });
      const point = snapPointAlongAngle(origin, pointer, angle, gridIncrement);
      const distance = Math.hypot(projectedPoint.x - pointer.x, projectedPoint.y - pointer.y);
      if (distance <= captureDistance) candidates.push({ angle: normalizeAngle(angle), distance, origin, point });
    });
  });
  return candidates
    .sort((a, b) => a.distance - b.distance)
    .map(({ angle, origin, point }) => ({ angle, origin, point }));
}

export function acquireCadPoint({
  anchor,
  candidates,
  gridIncrement = 1 / 16,
  objectSnapCycleIndex = 0,
  objectSnapEnabled,
  objectSnapModes,
  orthoEnabled,
  pointer,
  polarAngles,
  polarEnabled,
  polarToleranceDegrees = 4,
  snapDistance = 4,
  trackingCandidates = [],
}: {
  anchor: LinePoint | null;
  candidates: CadSnapCandidate[];
  gridIncrement?: number;
  objectSnapCycleIndex?: number;
  objectSnapEnabled: boolean;
  objectSnapModes: ObjectSnapMode[];
  orthoEnabled: boolean;
  pointer: LinePoint;
  polarAngles: number[];
  polarEnabled: boolean;
  polarToleranceDegrees?: number;
  snapDistance?: number;
  trackingCandidates?: CadTrackingCandidate[];
}): CadPointAcquisition {
  const snappedPointer = snapPointToGridIncrement(pointer, gridIncrement);
  if (objectSnapEnabled) {
    const eligible = candidates
      .filter((candidate) => objectSnapModes.includes(candidate.kind))
      .map((candidate, index) => ({
        candidate,
        distance: Math.hypot(candidate.point.x - pointer.x, candidate.point.y - pointer.y, candidate.point.z - pointer.z),
        index,
      }))
      .filter(({ distance }) => distance <= snapDistance)
      .sort((a, b) => a.distance - b.distance || a.index - b.index)
      .filter(({ candidate }, index, entries) => entries.findIndex(({ candidate: earlier }) =>
        earlier.kind === candidate.kind &&
        Math.abs(earlier.point.x - candidate.point.x) < 1e-8 &&
        Math.abs(earlier.point.y - candidate.point.y) < 1e-8 &&
        Math.abs(earlier.point.z - candidate.point.z) < 1e-8) === index);
    if (eligible.length) {
      const selected = eligible[((objectSnapCycleIndex % eligible.length) + eligible.length) % eligible.length].candidate;
      return { candidateCount: eligible.length, guideAngle: null, guideOrigin: null, point: snapLinePoint(selected.point), snapKind: selected.kind };
    }
    const tracked = trackingCandidates[0];
    if (tracked) {
      return {
        candidateCount: 0,
        guideAngle: tracked.angle,
        guideOrigin: tracked.origin,
        point: tracked.point,
        snapKind: "tracking",
      };
    }
  }
  if (anchor && orthoEnabled) {
    const ortho = snapLineDirection(anchor, pointer, [0, 90, 180, 270], 180);
    return { candidateCount: 0, guideAngle: ortho.angle, guideOrigin: anchor, point: snapPointAlongAngle(anchor, pointer, ortho.angle ?? 0, gridIncrement), snapKind: "ortho" };
  }
  if (anchor && polarEnabled) {
    const polar = snapLineDirection(anchor, pointer, polarAngles, polarToleranceDegrees);
    if (polar.angle !== null) return { candidateCount: 0, guideAngle: polar.angle, guideOrigin: anchor, point: snapPointAlongAngle(anchor, pointer, polar.angle, gridIncrement), snapKind: "polar" };
  }
  return { candidateCount: 0, guideAngle: null, guideOrigin: null, point: snappedPointer, snapKind: "grid" };
}
