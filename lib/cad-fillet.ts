import {
  lineGeometryIsValid,
  type LineGeometry,
  type LinePoint,
} from "./cad-line.ts";
import {
  arcSweepAngle,
  arcGeometryIsValid,
  cloneArcGeometry,
  normalizeArcAngle,
  type ArcGeometry,
} from "./cad-arc.ts";

export type LineFilletResult = {
  arc: ArcGeometry | null;
  center: LinePoint | null;
  first: LineGeometry;
  firstTangent: LinePoint;
  intersection: LinePoint;
  second: LineGeometry;
  secondTangent: LinePoint;
};

export type FilletCurveGeometry =
  | { geometry: ArcGeometry; kind: "arc" }
  | { geometry: LineGeometry; kind: "line" };

export type CurveFilletResult = {
  arc: ArcGeometry;
  first: FilletCurveGeometry;
  firstTangent: LinePoint;
  second: FilletCurveGeometry;
  secondTangent: LinePoint;
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
  const retained = endReach >= startReach ? "end" : "start";
  return {
    direction: { x: axis.x * sign, y: axis.y * sign },
    retained,
    reach: Math.max(startReach, endReach),
  };
}

function trimmedLine(
  line: LineGeometry,
  retained: "start" | "end",
  tangent: LinePoint,
): LineGeometry {
  return retained === "start"
    ? { start: { ...line.start }, end: tangent }
    : { start: tangent, end: { ...line.end } };
}

type LineCenterLocus = {
  direction: { x: number; y: number };
  kind: "line";
  point: LinePoint;
};

type CircleCenterLocus = {
  center: LinePoint;
  kind: "circle";
  radius: number;
  tangentSign: 1 | -1;
};

type CenterLocus = CircleCenterLocus | LineCenterLocus;

function curveCenterLoci(curve: FilletCurveGeometry, radius: number): CenterLocus[] {
  if (curve.kind === "line") {
    const dx = curve.geometry.end.x - curve.geometry.start.x;
    const dy = curve.geometry.end.y - curve.geometry.start.y;
    const length = Math.hypot(dx, dy);
    if (length < EPSILON) return [];
    const direction = { x: dx / length, y: dy / length };
    const normal = { x: -direction.y, y: direction.x };
    return [-1, 1].map((side) => ({
      direction,
      kind: "line" as const,
      point: stablePoint(
        curve.geometry.start.x + normal.x * radius * side,
        curve.geometry.start.y + normal.y * radius * side,
        curve.geometry.start.z,
      ),
    }));
  }
  const sourceRadius = curve.geometry.radius;
  const loci: CenterLocus[] = [{
    center: { ...curve.geometry.center },
    kind: "circle",
    radius: sourceRadius + radius,
    tangentSign: 1,
  }];
  const internalRadius = Math.abs(sourceRadius - radius);
  if (internalRadius > EPSILON) {
    loci.push({
      center: { ...curve.geometry.center },
      kind: "circle",
      radius: internalRadius,
      tangentSign: sourceRadius >= radius ? 1 : -1,
    });
  }
  return loci;
}

function lineCircleIntersections(line: LineCenterLocus, circle: CircleCenterLocus): LinePoint[] {
  const offset = { x: line.point.x - circle.center.x, y: line.point.y - circle.center.y };
  const along = offset.x * line.direction.x + offset.y * line.direction.y;
  const constant = offset.x ** 2 + offset.y ** 2 - circle.radius ** 2;
  const discriminant = along ** 2 - constant;
  if (discriminant < -EPSILON) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  const parameters = root <= EPSILON ? [-along] : [-along - root, -along + root];
  return parameters.map((parameter) => stablePoint(
    line.point.x + line.direction.x * parameter,
    line.point.y + line.direction.y * parameter,
    line.point.z,
  ));
}

function circleCircleIntersections(first: CircleCenterLocus, second: CircleCenterLocus): LinePoint[] {
  const dx = second.center.x - first.center.x;
  const dy = second.center.y - first.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < EPSILON || distance > first.radius + second.radius + EPSILON || distance < Math.abs(first.radius - second.radius) - EPSILON) return [];
  const along = (first.radius ** 2 - second.radius ** 2 + distance ** 2) / (2 * distance);
  const heightSquared = first.radius ** 2 - along ** 2;
  if (heightSquared < -EPSILON) return [];
  const height = Math.sqrt(Math.max(0, heightSquared));
  const base = {
    x: first.center.x + dx / distance * along,
    y: first.center.y + dy / distance * along,
  };
  const normal = { x: -dy / distance, y: dx / distance };
  const sides = height <= EPSILON ? [0] : [-1, 1];
  return sides.map((side) => stablePoint(
    base.x + normal.x * height * side,
    base.y + normal.y * height * side,
    first.center.z,
  ));
}

function locusIntersections(first: CenterLocus, second: CenterLocus): LinePoint[] {
  if (first.kind === "line" && second.kind === "line") return [];
  if (first.kind === "line" && second.kind === "circle") return lineCircleIntersections(first, second);
  if (first.kind === "circle" && second.kind === "line") return lineCircleIntersections(second, first);
  return circleCircleIntersections(first as CircleCenterLocus, second as CircleCenterLocus);
}

function tangentPoint(curve: FilletCurveGeometry, locus: CenterLocus, center: LinePoint): LinePoint | null {
  if (curve.kind === "line" && locus.kind === "line") {
    const offset = { x: center.x - curve.geometry.start.x, y: center.y - curve.geometry.start.y };
    const parameter = offset.x * locus.direction.x + offset.y * locus.direction.y;
    return stablePoint(
      curve.geometry.start.x + locus.direction.x * parameter,
      curve.geometry.start.y + locus.direction.y * parameter,
      curve.geometry.start.z,
    );
  }
  if (curve.kind === "arc" && locus.kind === "circle") {
    const dx = center.x - curve.geometry.center.x;
    const dy = center.y - curve.geometry.center.y;
    const distance = Math.hypot(dx, dy);
    if (distance < EPSILON) return null;
    return stablePoint(
      curve.geometry.center.x + dx / distance * curve.geometry.radius * locus.tangentSign,
      curve.geometry.center.y + dy / distance * curve.geometry.radius * locus.tangentSign,
      curve.geometry.center.z,
    );
  }
  return null;
}

function trimLineToTangent(line: LineGeometry, tangent: LinePoint, pick: LinePoint): LineGeometry | null {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  if (length < EPSILON) return null;
  const direction = { x: dx / length, y: dy / length };
  const pickProjection = (pick.x - tangent.x) * direction.x + (pick.y - tangent.y) * direction.y;
  const startProjection = (line.start.x - tangent.x) * direction.x + (line.start.y - tangent.y) * direction.y;
  const endProjection = (line.end.x - tangent.x) * direction.x + (line.end.y - tangent.y) * direction.y;
  const sign = Math.abs(pickProjection) > EPSILON
    ? Math.sign(pickProjection)
    : Math.abs(pick.x - line.end.x) + Math.abs(pick.y - line.end.y) <= Math.abs(pick.x - line.start.x) + Math.abs(pick.y - line.start.y) ? 1 : -1;
  const keepEnd = endProjection * sign >= startProjection * sign;
  const result = keepEnd
    ? { start: tangent, end: { ...line.end } }
    : { start: { ...line.start }, end: tangent };
  return lineGeometryIsValid(result) ? result : null;
}

function directedAngleDistance(start: number, end: number, counterclockwise: boolean): number {
  return counterclockwise ? normalizeArcAngle(end - start) : normalizeArcAngle(start - end);
}

function trimArcToTangent(arc: ArcGeometry, tangent: LinePoint, pick: LinePoint): ArcGeometry | null {
  const tangentAngle = normalizeArcAngle(Math.atan2(tangent.y - arc.center.y, tangent.x - arc.center.x) * 180 / Math.PI);
  const pickAngle = normalizeArcAngle(Math.atan2(pick.y - arc.center.y, pick.x - arc.center.x) * 180 / Math.PI);
  const originalSweep = arcSweepAngle(arc);
  const pickDistance = Math.min(originalSweep, directedAngleDistance(arc.startAngle, pickAngle, arc.counterclockwise));
  const keepStart = pickDistance <= originalSweep / 2;
  const result = {
    ...cloneArcGeometry(arc),
    startAngle: keepStart ? arc.startAngle : tangentAngle,
    endAngle: keepStart ? tangentAngle : arc.endAngle,
  };
  if (!arcGeometryIsValid(result)) return null;
  const retainedPickDistance = directedAngleDistance(result.startAngle, pickAngle, result.counterclockwise);
  return retainedPickDistance <= arcSweepAngle(result) + 1e-6 ? result : null;
}

function trimCurveToTangent(curve: FilletCurveGeometry, tangent: LinePoint, pick: LinePoint): FilletCurveGeometry | null {
  if (curve.kind === "line") {
    const geometry = trimLineToTangent(curve.geometry, tangent, pick);
    return geometry ? { geometry, kind: "line" } : null;
  }
  const geometry = trimArcToTangent(curve.geometry, tangent, pick);
  return geometry ? { geometry, kind: "arc" } : null;
}

function filletArc(center: LinePoint, firstTangent: LinePoint, secondTangent: LinePoint, radius: number): ArcGeometry | null {
  const startAngle = normalizeArcAngle(Math.atan2(firstTangent.y - center.y, firstTangent.x - center.x) * 180 / Math.PI);
  const endAngle = normalizeArcAngle(Math.atan2(secondTangent.y - center.y, secondTangent.x - center.x) * 180 / Math.PI);
  const counterclockwise = normalizeArcAngle(endAngle - startAngle) <= 180;
  const arc = { center: { ...center }, radius: stableNumber(radius), startAngle, endAngle, counterclockwise };
  return arcGeometryIsValid(arc) ? arc : null;
}

/** Builds the best picked-side tangent Fillet for Line–Arc and Arc–Arc pairs. */
export function filletCurveGeometries(
  first: FilletCurveGeometry,
  second: FilletCurveGeometry,
  firstPick: LinePoint,
  secondPick: LinePoint,
  radius: number,
): CurveFilletResult | null {
  if (first.kind === "line" && second.kind === "line") {
    const result = filletLineGeometries(first.geometry, second.geometry, firstPick, secondPick, radius);
    return result?.arc ? {
      arc: result.arc,
      first: { geometry: result.first, kind: "line" },
      firstTangent: result.firstTangent,
      second: { geometry: result.second, kind: "line" },
      secondTangent: result.secondTangent,
    } : null;
  }
  if (!Number.isFinite(radius) || radius <= 0) return null;
  const firstValid = first.kind === "line" ? lineGeometryIsValid(first.geometry) : arcGeometryIsValid(first.geometry);
  const secondValid = second.kind === "line" ? lineGeometryIsValid(second.geometry) : arcGeometryIsValid(second.geometry);
  const firstElevation = first.kind === "line" ? first.geometry.start.z : first.geometry.center.z;
  const secondElevation = second.kind === "line" ? second.geometry.start.z : second.geometry.center.z;
  if (!firstValid || !secondValid || Math.abs(firstElevation - secondElevation) > EPSILON) return null;

  const candidates: Array<CurveFilletResult & { score: number }> = [];
  for (const firstLocus of curveCenterLoci(first, radius)) {
    for (const secondLocus of curveCenterLoci(second, radius)) {
      for (const center of locusIntersections(firstLocus, secondLocus)) {
        const firstTangent = tangentPoint(first, firstLocus, center);
        const secondTangent = tangentPoint(second, secondLocus, center);
        if (!firstTangent || !secondTangent) continue;
        const firstResult = trimCurveToTangent(first, firstTangent, firstPick);
        const secondResult = trimCurveToTangent(second, secondTangent, secondPick);
        const arc = filletArc(center, firstTangent, secondTangent, radius);
        if (!firstResult || !secondResult || !arc) continue;
        const score = Math.hypot(firstTangent.x - firstPick.x, firstTangent.y - firstPick.y) +
          Math.hypot(secondTangent.x - secondPick.x, secondTangent.y - secondPick.y);
        candidates.push({ arc, first: firstResult, firstTangent, second: secondResult, secondTangent, score });
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  if (!best) return null;
  return { arc: best.arc, first: best.first, firstTangent: best.firstTangent, second: best.second, secondTangent: best.secondTangent };
}

/**
 * Builds the exact planar tangent fillet between two infinite line paths.
 * Picks choose which ray from the intersection is retained, matching CAD
 * selection semantics. The source line IDs are intentionally outside this
 * solver so document edits can preserve them.
 */
export function filletLineGeometries(
  first: LineGeometry,
  second: LineGeometry,
  firstPick: LinePoint,
  secondPick: LinePoint,
  radius: number,
): LineFilletResult | null {
  if (!lineGeometryIsValid(first) || !lineGeometryIsValid(second) || !Number.isFinite(radius) || radius < 0) return null;
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
  const dot = Math.max(-1, Math.min(1,
    firstSide.direction.x * secondSide.direction.x + firstSide.direction.y * secondSide.direction.y,
  ));
  const angle = Math.acos(dot);
  if (angle < EPSILON || Math.PI - angle < EPSILON) return null;

  const tangentDistance = radius === 0 ? 0 : radius / Math.tan(angle / 2);
  if (!Number.isFinite(tangentDistance) || firstSide.reach + EPSILON < tangentDistance || secondSide.reach + EPSILON < tangentDistance) return null;
  const firstTangent = stablePoint(
    intersection.x + firstSide.direction.x * tangentDistance,
    intersection.y + firstSide.direction.y * tangentDistance,
    intersection.z,
  );
  const secondTangent = stablePoint(
    intersection.x + secondSide.direction.x * tangentDistance,
    intersection.y + secondSide.direction.y * tangentDistance,
    intersection.z,
  );
  const firstResult = trimmedLine(first, firstSide.retained, firstTangent);
  const secondResult = trimmedLine(second, secondSide.retained, secondTangent);
  if (!lineGeometryIsValid(firstResult) || !lineGeometryIsValid(secondResult)) return null;

  if (radius === 0) {
    return {
      arc: null,
      center: null,
      first: firstResult,
      firstTangent,
      intersection,
      second: secondResult,
      secondTangent,
    };
  }

  const bisectorX = firstSide.direction.x + secondSide.direction.x;
  const bisectorY = firstSide.direction.y + secondSide.direction.y;
  const bisectorLength = Math.hypot(bisectorX, bisectorY);
  const centerDistance = radius / Math.sin(angle / 2);
  if (bisectorLength < EPSILON || !Number.isFinite(centerDistance)) return null;
  const center = stablePoint(
    intersection.x + bisectorX / bisectorLength * centerDistance,
    intersection.y + bisectorY / bisectorLength * centerDistance,
    intersection.z,
  );
  const startAngle = normalizeArcAngle(Math.atan2(firstTangent.y - center.y, firstTangent.x - center.x) * 180 / Math.PI);
  const endAngle = normalizeArcAngle(Math.atan2(secondTangent.y - center.y, secondTangent.x - center.x) * 180 / Math.PI);
  const counterclockwiseDistance = normalizeArcAngle(endAngle - startAngle);
  const arc: ArcGeometry = {
    center,
    radius: stableNumber(radius),
    startAngle,
    endAngle,
    counterclockwise: counterclockwiseDistance <= 180,
  };
  if (!arcGeometryIsValid(arc)) return null;
  return {
    arc,
    center,
    first: firstResult,
    firstTangent,
    intersection,
    second: secondResult,
    secondTangent,
  };
}
